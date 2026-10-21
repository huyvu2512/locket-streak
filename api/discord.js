import { db } from './db.js';
import { formatVietnamDateTime } from './verify.js';

/**
 * API Quản Lý Liên Kết Discord (Webhook)
 * Method: POST /api/discord
 * Body:
 *   - { action: 'link', uid: string, webhookUrl: string }
 *   - { action: 'unlink', uid: string }
 */
export default async function discordHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { action, uid, webhookUrl } = req.body || {};
  if (!uid) {
    return res.status(400).json({ success: false, message: 'Thiếu UID người dùng.' });
  }

  try {
    // 1. Huỷ liên kết
    if (action === 'unlink') {
      if (db) {
        await db.collection('users').doc(uid).set({ discordId: null }, { merge: true });
      }
      return res.status(200).json({
        success: true,
        linked: false,
        message: 'Đã huỷ liên kết thông báo Discord.'
      });
    }

    // 2. Liên kết & Kiểm tra Webhook
    if (action === 'link') {
      const cleanUrl = (webhookUrl || '').trim();

      if (!cleanUrl.startsWith('https://discord.com/api/webhooks/') && 
          !cleanUrl.startsWith('https://discordapp.com/api/webhooks/')) {
        return res.status(400).json({
          success: false,
          message: 'Webhook URL Discord không đúng định dạng (bắt đầu bằng https://discord.com/api/webhooks/...)'
        });
      }

      // Lấy tên hiển thị của tài khoản
      let accountName = 'Tài khoản Locket';
      if (db) {
        try {
          const userDoc = await db.collection('users').doc(uid).get();
          if (userDoc.exists) {
            const uData = userDoc.data() || {};
            accountName = uData.displayName || uData.username || uData.email || 'Tài khoản Locket';
          }
        } catch (e) {
          console.warn('[Discord] Lỗi đọc user từ DB:', e.message);
        }
      }

      const timeStr = formatVietnamDateTime();

      // Gửi 1 tin nhắn test qua Webhook theo đúng mẫu chuẩn
      const testPayload = {
        username: 'Locket Streak',
        ...(process.env.DISCORD_BOT_AVATAR ? { avatar_url: process.env.DISCORD_BOT_AVATAR } : {}),
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

      // Lưu vào Firestore
      if (db) {
        await db.collection('users').doc(uid).set({
          discordId: cleanUrl
        }, { merge: true });
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
