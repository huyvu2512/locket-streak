import { db } from '../lib/db.js';
import { formatVietnamDateTime } from './verify.js';

/**
 * API Hợp Nhất Quản Lý Webhook & Thông Báo (Telegram & Discord)
 * Endpoint: /api/webhook (hỗ trợ rewrite ngầm từ /api/telegram và /api/discord)
 */
export default async function webhookHandler(req, res) {
  // Xác định kênh thông báo (discord hay telegram)
  const queryChannel = String(req.query?.channel || '').toLowerCase();
  const urlPath = String(req.url || '').toLowerCase();
  const body = req.body || {};

  let isDiscord = queryChannel === 'discord' || urlPath.includes('discord') || Boolean(body.webhookUrl);
  let isTelegram = queryChannel === 'telegram' || urlPath.includes('telegram') || Boolean(body.teleCode) || (!isDiscord && req.method === 'GET');

  // Mặc định nếu không xác định được mà có action check/unlink và không có webhookUrl thì ưu tiên telegram
  if (!isDiscord && !isTelegram) {
    if (body.action === 'link' || body.webhookUrl) {
      isDiscord = true;
    } else {
      isTelegram = true;
    }
  }

  // ==========================================
  // 1. XỬ LÝ KÊNH TELEGRAM
  // ==========================================
  if (isTelegram && !isDiscord) {
    const botUsername = (process.env.TELEGRAM_BOT_USERNAME || '').replace('@', '').trim();

    // GET: Trả về thông tin cấu hình bot Telegram
    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        botUsername
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { action, uid, teleCode } = body;
    const cleanUid = typeof uid === 'string' ? uid.trim() : '';

    if (!cleanUid || !/^[a-zA-Z0-9_-]{10,64}$/.test(cleanUid)) {
      return res.status(400).json({ success: false, message: 'Mã UID không hợp lệ.' });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return res.status(500).json({
        success: false,
        message: 'Chưa cấu hình TELEGRAM_BOT_TOKEN trong biến môi trường hệ thống.'
      });
    }

    try {
      let userRef = null;
      let userDoc = null;
      if (db) {
        userRef = db.collection('users').doc(cleanUid);
        userDoc = await userRef.get();
        if (!userDoc.exists) {
          return res.status(404).json({
            success: false,
            message: 'Tài khoản không tồn tại trong hệ thống.'
          });
        }
      }

      // Huỷ liên kết Telegram
      if (action === 'unlink') {
        if (userRef) {
          await userRef.update({ telegramId: null });
        }
        return res.status(200).json({
          success: true,
          linked: false,
          message: 'Đã huỷ liên kết thông báo Telegram.'
        });
      }

      // Kiểm tra tín hiệu /start qua getUpdates
      if (action === 'check') {
        const getUpdatesUrl = `https://api.telegram.org/bot${token}/getUpdates?offset=-30&limit=30`;
        const teleRes = await fetch(getUpdatesUrl);
        const teleData = await teleRes.json();

        if (!teleRes.ok || !teleData.ok) {
          return res.status(502).json({
            success: false,
            message: 'Không thể kết nối đến máy chủ Telegram. Vui lòng thử lại sau.'
          });
        }

        const updates = teleData.result || [];
        const normalizedUid = String(uid).trim();
        const nowSec = Math.floor(Date.now() / 1000);

        let matchedChatId = null;
        let senderName = null;

        for (let i = updates.length - 1; i >= 0; i--) {
          const msg = updates[i]?.message;
          const text = (msg?.text || '').trim();
          const msgDate = Number(msg?.date) || 0;

          if (msgDate > 0 && (nowSec - msgDate > 600)) {
            continue;
          }

          if (!text.includes(normalizedUid)) continue;

          matchedChatId = msg?.chat?.id;
          senderName = msg?.from?.username 
            ? `@${msg.from.username}` 
            : [msg?.from?.first_name, msg?.from?.last_name].filter(Boolean).join(' ') || 'Người dùng';
          break;
        }

        if (matchedChatId) {
          const strChatId = String(matchedChatId);

          let accountName = 'Tài khoản Locket';
          if (userRef && userDoc && userDoc.exists) {
            const uData = userDoc.data() || {};
            accountName = uData.displayName || uData.username || uData.email || 'Tài khoản Locket';
            await userRef.update({
              telegramId: strChatId
            });
          }

          try {
            const timeStr = formatVietnamDateTime();
            const teleMsg = `🔥 Liên kết thành công!\n\nTài khoản: ${accountName}\nThời gian: ${timeStr}\nChào mừng ${senderName}, bạn sẽ nhận thông báo tự động mỗi khi chuỗi Locket của bạn được duy trì.`;

            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: strChatId,
                text: teleMsg
              })
            });
          } catch (e) {
            console.warn('[Telegram] Gửi tin nhắn xác nhận thất bại:', e.message);
          }

          return res.status(200).json({
            success: true,
            linked: true,
            botUsername,
            telegramId: strChatId,
            senderName,
            message: 'Liên kết Telegram thành công!'
          });
        }

        return res.status(200).json({
          success: true,
          linked: false,
          botUsername,
          message: 'Chưa tìm thấy tin nhắn /start hợp lệ (hoặc mã đã quá hạn 5 phút). Vui lòng bấm "Mở Telegram Bot" và nhấn Bắt đầu lại.'
        });
      }

      return res.status(400).json({ success: false, message: 'Hành động không hợp lệ.' });

    } catch (error) {
      console.error('[API Telegram] Lỗi:', error.message);
      return res.status(500).json({
        success: false,
        message: `Lỗi xử lý Telegram: ${error.message}`
      });
    }
  }

  // ==========================================
  // 2. XỬ LÝ KÊNH DISCORD
  // ==========================================
  if (isDiscord) {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { action, uid, webhookUrl } = body;
    const cleanUid = typeof uid === 'string' ? uid.trim() : '';

    if (!cleanUid || !/^[a-zA-Z0-9_-]{10,64}$/.test(cleanUid)) {
      return res.status(400).json({ success: false, message: 'Mã UID không hợp lệ.' });
    }

    try {
      let userRef = null;
      let userDoc = null;
      if (db) {
        userRef = db.collection('users').doc(cleanUid);
        userDoc = await userRef.get();
        if (!userDoc.exists) {
          return res.status(404).json({
            success: false,
            message: 'Tài khoản không tồn tại trong hệ thống.'
          });
        }
      }

      // Huỷ liên kết Discord
      if (action === 'unlink') {
        if (userRef) {
          await userRef.update({ discordId: null });
        }
        return res.status(200).json({
          success: true,
          linked: false,
          message: 'Đã huỷ liên kết thông báo Discord.'
        });
      }

      // Liên kết & Kiểm tra Webhook Discord
      if (action === 'link') {
        const cleanUrl = (webhookUrl || '').trim();

        if (!cleanUrl.startsWith('https://discord.com/api/webhooks/') && 
            !cleanUrl.startsWith('https://discordapp.com/api/webhooks/')) {
          return res.status(400).json({
            success: false,
            message: 'Webhook URL Discord không đúng định dạng (bắt đầu bằng https://discord.com/api/webhooks/...)'
          });
        }

        let accountName = 'Tài khoản Locket';
        if (userDoc && userDoc.exists) {
          const uData = userDoc.data() || {};
          accountName = uData.displayName || uData.username || uData.email || 'Tài khoản Locket';
        }

        const timeStr = formatVietnamDateTime();

        const testPayload = {
          username: 'Locket Streak',
          embeds: [
            {
              title: 'Liên kết thành công!',
              description: `Tài khoản: ${accountName}\nKênh Discord này đã được kết nối để nhận thông báo tự động mỗi khi chuỗi Locket của bạn được duy trì.`,
              color: 16763904, // Màu vàng #FFCC00
              footer: {
                text: `Locket Streak • ${timeStr}`
              }
            }
          ]
        };

        const testRes = await fetch(cleanUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload)
        });

        if (!testRes.ok) {
          const errText = await testRes.text();
          return res.status(400).json({
            success: false,
            message: `Không thể gửi tin nhắn thử nghiệm đến Discord: ${errText || 'Mã lỗi ' + testRes.status}`
          });
        }

        if (userRef) {
          await userRef.update({
            discordId: cleanUrl
          });
        }

        return res.status(200).json({
          success: true,
          linked: true,
          discordId: cleanUrl,
          message: 'Liên kết Discord thành công! Tin nhắn xác nhận đã gửi đến kênh của bạn.'
        });
      }

      return res.status(400).json({ success: false, message: 'Hành động không hợp lệ.' });

    } catch (error) {
      console.error('[API Discord] Lỗi:', error.message);
      return res.status(500).json({
        success: false,
        message: `Lỗi xử lý Discord: ${error.message}`
      });
    }
  }

  return res.status(400).json({ success: false, message: 'Yêu cầu không hợp lệ.' });
}
