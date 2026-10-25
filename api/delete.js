import { db } from '../lib/db.js';

/**
 * API Xóa Toàn Bộ Dữ Liệu Tài Khoản Khỏi Hệ Thống (Delete Account from Database)
 * Method: POST /api/delete
 * Body: { uid: string, sessionSecret?: string }
 */
export default async function deleteHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { uid, sessionSecret } = req.body || {};
  const headerSecret = req.headers['x-session-secret'];
  const provided = sessionSecret || headerSecret;

  const cleanUid = typeof uid === 'string' ? uid.trim() : '';
  if (!cleanUid || !/^[a-zA-Z0-9_-]{10,64}$/.test(cleanUid)) {
    return res.status(400).json({ success: false, message: 'Mã UID không hợp lệ.' });
  }

  if (!db) {
    return res.status(503).json({ success: false, message: 'Dịch vụ Firestore tạm thời gián đoạn.' });
  }

  try {
    const userRef = db.collection('users').doc(cleanUid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(200).json({
        success: true,
        message: 'Tài khoản không tồn tại hoặc đã được xóa trước đó.'
      });
    }

    const uData = userDoc.data() || {};

    // Kiểm tra bảo mật qua sessionSecret:
    // Nếu tài khoản có sessionSecret VÀ phiên chưa bị đánh dấu hết hạn (còn sống) VÀ mã gửi lên không khớp
    if (uData.sessionSecret && !uData.isSessionExpired && provided && provided !== uData.sessionSecret) {
      return res.status(403).json({
        success: false,
        message: 'Quyền truy cập bị từ chối. Mã bảo mật phiên không khớp.'
      });
    }

    // Xóa triệt để tài liệu tài khoản trong Firestore
    await userRef.delete();
    console.log(`\x1b[32m✔ [Delete API] Đã xóa vĩnh viễn tài khoản ${cleanUid.slice(0, 8)}... khỏi Firestore.\x1b[0m`);

    return res.status(200).json({
      success: true,
      message: 'Đã xóa toàn bộ dữ liệu tài khoản khỏi hệ thống thành công.'
    });

  } catch (error) {
    console.error('[Delete API] Lỗi khi xóa tài khoản:', error.message);
    return res.status(500).json({
      success: false,
      message: `Lỗi xử lý xóa dữ liệu: ${error.message}`
    });
  }
}
