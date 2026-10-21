import { db } from './db.js';

/**
 * API Bật / Tắt Tự Động Giữ Chuỗi (Auto Streak)
 * Method: POST /api/auto
 * Body: {
 *   uid: string,
 *   autoStreak?: boolean,
 *   enabled?: boolean
 * }
 */
export default async function autoHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { uid, autoStreak, enabled, sessionSecret } = req.body || {};
  const cleanUid = typeof uid === 'string' ? uid.trim() : '';

  if (!cleanUid || !/^[a-zA-Z0-9_-]{10,64}$/.test(cleanUid)) {
    return res.status(400).json({ success: false, message: 'Mã UID không hợp lệ.' });
  }

  const headerSecret = req.headers['x-session-secret'];
  const provided = sessionSecret || headerSecret;

  try {
    let newState = null;
    let uData = {};

    if (db) {
      const userRef = db.collection('users').doc(cleanUid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Tài khoản không tồn tại trong hệ thống.'
        });
      }

      uData = userDoc.data() || {};
      // Nếu user có sessionSecret thì bắt buộc phải khớp
      if (uData.sessionSecret && provided !== uData.sessionSecret) {
        return res.status(403).json({
          success: false,
          message: 'Quyền truy cập bị từ chối. Phiên làm việc không hợp lệ.'
        });
      }

      if (typeof autoStreak === 'boolean') {
        newState = autoStreak;
      } else if (typeof enabled === 'boolean') {
        newState = enabled;
      } else {
        const current = Boolean(uData.autoStreak);
        newState = !current;
      }

      await userRef.update({
        autoStreak: newState
      });
    } else {
      newState = typeof autoStreak === 'boolean' ? autoStreak : (typeof enabled === 'boolean' ? enabled : true);
    }

    return res.status(200).json({
      success: true,
      autoStreak: newState,
      message: newState ? 'Đã bật tự động giữ chuỗi.' : 'Đã tắt tự động giữ chuỗi.'
    });

  } catch (error) {
    console.error('[API Auto] Lỗi cập nhật trạng thái auto:', error.message);
    return res.status(500).json({
      success: false,
      message: `Lỗi cập nhật tự động giữ chuỗi: ${error.message}`
    });
  }
}
