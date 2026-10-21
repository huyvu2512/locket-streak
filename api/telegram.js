import { db } from './db.js';
import { formatVietnamDateTime } from './verify.js';

/**
 * API Quản Lý Liên Kết Telegram
 * Method: POST /api/telegram
 * Body: 
 *   - { action: 'check', uid: string }
 *   - { action: 'unlink', uid: string }
 */
export default async function telegramHandler(req, res) {
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

  const { action, uid, teleCode } = req.body || {};
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

    // 1. Huỷ liên kết
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

    // 2. Kiểm tra tín hiệu /start qua getUpdates (hạn 5 phút và đúng mã phiên)
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
      const cleanTeleCode = teleCode ? String(teleCode).trim() : null;
      const nowSec = Math.floor(Date.now() / 1000);

      let matchedChatId = null;
      let senderName = null;

      // Duyệt từ tin nhắn mới nhất ngược lại
      for (let i = updates.length - 1; i >= 0; i--) {
        const msg = updates[i]?.message;
        const text = (msg?.text || '').trim();
        const msgDate = Number(msg?.date) || 0;

        // Bỏ qua tin nhắn đã quá hạn 10 phút (600 giây)
        if (msgDate > 0 && (nowSec - msgDate > 600)) {
          continue;
        }

        // Kiểm tra khớp UID
        const hasUid = text.includes(normalizedUid);
        if (!hasUid) continue;

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

        // Gửi tin nhắn chào mừng và xác nhận đến Telegram của người dùng theo mẫu chuẩn
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
          telegramId: strChatId,
          senderName,
          message: 'Liên kết Telegram thành công!'
        });
      }

      return res.status(200).json({
        success: true,
        linked: false,
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
