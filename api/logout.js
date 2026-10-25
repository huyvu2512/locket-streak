import { db } from '../lib/db.js';

/**
 * API Đăng Xuất Tài Khoản Khỏi Thiết Bị
 * Method: POST /api/logout
 * Body: { uid: string, sessionSecret?: string }
 * Mục đích: Hủy phiên đăng nhập trên thiết bị hiện tại, không xóa dữ liệu trên hệ thống (bot vẫn có thể giữ chuỗi nếu bật tự động).
 */
export default async function logoutHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { uid, sessionSecret } = req.body || {};
  const headerSecret = req.headers['x-session-secret'];
  const provided = sessionSecret || headerSecret;

  const cleanUid = typeof uid === 'string' ? uid.trim() : '';

  try {
    if (cleanUid && db) {
      const userRef = db.collection('users').doc(cleanUid);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        // Cập nhật mốc thời gian đăng xuất thiết bị
        await userRef.update({
          lastLogoutAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).catch(() => {});
        console.log(`[Logout] Đã ghi nhận đăng xuất thiết bị cho tài khoản ${cleanUid.slice(0, 8)}...`);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Đã đăng xuất tài khoản khỏi thiết bị thành công.'
    });

  } catch (error) {
    console.error('[Logout API] Lỗi khi đăng xuất:', error.message);
    return res.status(500).json({
      success: false,
      message: `Lỗi xử lý đăng xuất: ${error.message}`
    });
  }
}
