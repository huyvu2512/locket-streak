import { db } from './db.js';

/**
 * API Đăng Xuất & Xóa Phiên Tài Khoản
 * Method: POST /api/logout
 * Body: { uid: string }
 */
export default async function logoutHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { uid, sessionSecret } = req.body || {};
  const headerSecret = req.headers['x-session-secret'];
  const provided = sessionSecret || headerSecret;

  try {
    // 1. Kiểm tra quyền sở hữu tài khoản qua sessionSecret
    if (uid && db) {
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const uData = userDoc.data() || {};
        // Nếu tài khoản có sessionSecret trong DB thì bắt buộc phải khớp
        if (uData.sessionSecret && provided !== uData.sessionSecret) {
          return res.status(403).json({
            success: false,
            message: 'Quyền truy cập bị từ chối. Phiên làm việc không hợp lệ.'
          });
        }
        await userRef.delete();
        console.log(`[Logout] Đã xóa tài khoản ${uid.slice(0, 8)}... khỏi Firestore.`);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Đăng xuất và hủy phiên tài khoản thành công.'
    });

  } catch (error) {
    console.error('[Logout API] Lỗi khi đăng xuất:', error.message);
    return res.status(500).json({
      success: false,
      message: `Lỗi xử lý đăng xuất: ${error.message}`
    });
  }
}
