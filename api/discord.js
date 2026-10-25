import { db } from '../lib/db.js';
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

    // 1. Huỷ liên kết
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
      if (userDoc && userDoc.exists) {
        const uData = userDoc.data() || {};
        accountName = uData.displayName || uData.username || uData.email || 'Tài khoản Locket';
      }

      const timeStr = formatVietnamDateTime();

      // Gửi 1 tin nhắn test qua Webhook theo đúng mẫu chuẩn
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

      // Lưu vào Firestore
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
