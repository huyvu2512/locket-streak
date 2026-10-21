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
  if (!uid) {
    return res.status(400).json({ success: false, message: 'Thiếu UID người dùng.' });
  }

  const headerSecret = req.headers['x-session-secret'];
  const provided = sessionSecret || headerSecret;

  try {
    let newState = null;
    let uData = {};

    if (db) {
      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        uData = userDoc.data() || {};
        // Nếu user có sessionSecret thì bắt buộc phải khớp
        if (uData.sessionSecret && provided !== uData.sessionSecret) {
          return res.status(403).json({
            success: false,
            message: 'Quyền truy cập bị từ chối. Phiên làm việc không hợp lệ.'
          });
        }
      }
    }

    if (typeof autoStreak === 'boolean') {
      newState = autoStreak;
    } else if (typeof enabled === 'boolean') {
      newState = enabled;
    } else if (db) {
      // Nếu không truyền boolean, tự động đảo trạng thái hiện tại trong DB
      const userDoc = await db.collection('users').doc(uid).get();
      const current = userDoc.exists ? Boolean(userDoc.data()?.autoStreak) : false;
      newState = !current;
    } else {
      newState = true;
    }

    if (db) {
      await db.collection('users').doc(uid).set({
        autoStreak: newState
      }, { merge: true });
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
