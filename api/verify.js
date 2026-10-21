import crypto from 'crypto';
import { db } from './db.js';

export const LOCKET_FIREBASE_KEY = process.env.LOCKET_FIREBASE_KEY || '';
export const LOCKET_API_URL = (process.env.LOCKET_API_URL || '').replace(/\/+$/, '');
export const LOCKET_STORAGE_URL = (process.env.LOCKET_STORAGE_URL || '').replace(/\/+$/, '');
export const LOCKET_STORAGE_BUCKET = process.env.LOCKET_STORAGE_BUCKET || '';
export const LOCKET_AUTH_URL = process.env.LOCKET_AUTH_URL || '';
export const LOCKET_REFRESH_TOKEN_URL = process.env.LOCKET_REFRESH_TOKEN_URL || '';

export const IOS_HEADERS = {
  'Content-Type': 'application/json',
  'X-Client-Version': process.env.LOCKET_CLIENT_VERSION || '',
  'X-Ios-Bundle-Identifier': process.env.LOCKET_BUNDLE_ID || ''
};

// Thời gian Việt Nam (UTC+7) chuẩn ISO "YYYY-MM-DD HH:mm:ss"
export const getVietnamTime = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace('T', ' ');
export const getVietnamTodayNumber = () => Number(new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(/-/g, ''));
export const parseVietnamTimeToMs = (timeStr) => timeStr ? new Date(`${timeStr.replace(' ', 'T')}+07:00`).getTime() : 0;

/**
 * Định dạng thời gian Việt Nam dạng "HH:mm DD/MM/YYYY" (Ví dụ: 08:30 21/10/2026)
 */
export function formatVietnamDateTime(date = new Date()) {
  const d = new Date(date);
  const vnStr = d.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
  const vnDate = new Date(vnStr);
  const hh = String(vnDate.getHours()).padStart(2, '0');
  const mm = String(vnDate.getMinutes()).padStart(2, '0');
  const day = String(vnDate.getDate()).padStart(2, '0');
  const month = String(vnDate.getMonth() + 1).padStart(2, '0');
  const year = vnDate.getFullYear();
  return `${hh}:${mm} ${day}/${month}/${year}`;
}


// Danh sách các model iPhone phổ biến xoay vòng để tránh mẫu User-Agent đơn điệu
const IPHONE_MODELS = [
  { hw: 'iPhone14,2', os: '17.5.1', build: '2.68.0' }, // iPhone 13 Pro
  { hw: 'iPhone14,5', os: '17.6', build: '2.68.1' },   // iPhone 13
  { hw: 'iPhone15,2', os: '17.6.1', build: '2.69.0' }, // iPhone 14 Pro
  { hw: 'iPhone15,3', os: '18.0', build: '2.69.1' },   // iPhone 14 Pro Max
  { hw: 'iPhone16,1', os: '18.0.1', build: '2.70.0' }, // iPhone 15 Pro
  { hw: 'iPhone16,2', os: '18.1', build: '2.70.0' }    // iPhone 15 Pro Max
];

/**
 * Tạo bộ headers giả lập Locket iOS tự nhiên với User-Agent xoay vòng ngẫu nhiên
 */
export function getRandomLocketHeaders(idToken) {
  const model = IPHONE_MODELS[Math.floor(Math.random() * IPHONE_MODELS.length)];
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`,
    'User-Agent': `${process.env.LOCKET_BUNDLE_ID || ''}/${model.build} iPhone/${model.os} hw/${model.hw}`,
    'Time-Zone': 'Asia/Ho_Chi_Minh',
    'Timezone': 'Asia/Ho_Chi_Minh',
    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
  };
}

/**
 * Trả về Promise tạm dừng một khoảng thời gian ngẫu nhiên (Jitter) giữa các request
 */
export function getRandomDelay(min = 1200, max = 2800) {
  return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));
}

/**
 * Xác thực Email & Mật khẩu trực tiếp với Locket (Google Identity Toolkit)
 */
async function loginWithEmailPassword(email, password) {
  const url = `${LOCKET_AUTH_URL}?key=${LOCKET_FIREBASE_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: IOS_HEADERS,
    body: JSON.stringify({
      email,
      password,
      clientType: "CLIENT_TYPE_IOS",
      returnSecureToken: true
    })
  });

  const data = await res.json();
  if (!res.ok) {
    let msg = 'Đăng nhập Locket thất bại.';
    const err = data.error?.message || '';
    if (err.includes('INVALID_PASSWORD') || err.includes('INVALID_LOGIN_CREDENTIALS')) {
      msg = 'Mật khẩu hoặc Email không chính xác.';
    } else if (err.includes('EMAIL_NOT_FOUND')) {
      msg = 'Tài khoản không tồn tại trên hệ thống Locket.';
    } else if (err.includes('TOO_MANY_ATTEMPTS')) {
      msg = 'Đã vượt quá số lần thử đăng nhập. Vui lòng thử lại sau ít phút.';
    } else if (err.includes('USER_DISABLED')) {
      msg = 'Tài khoản Locket đã bị tạm khóa hoặc vô hiệu hóa.';
    } else if (err) {
      msg = err;
    }
    throw new Error(msg);
  }

  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    uid: data.localId,
    email: data.email || email
  };
}

/**
 * Đổi refreshToken lấy idToken mới qua Google Secure Token API
 */
async function refreshIdToken(refreshToken) {
  const url = `${LOCKET_REFRESH_TOKEN_URL}?key=${LOCKET_FIREBASE_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Client-Version': process.env.LOCKET_CLIENT_VERSION || '',
      'X-Ios-Bundle-Identifier': process.env.LOCKET_BUNDLE_ID || ''
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
  }

  return {
    idToken: data.id_token || data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    uid: data.user_id
  };
}

/**
 * API Xác thực & Quản lý Token duy nhất của hệ thống
 * Method: POST /api/verify
 * Body:
 *  - Trường hợp 1 (Xác thực lần đầu / Đổi pass): { email, password }
 *  - Trường hợp 2 (Cập nhật cài đặt tài khoản):  { uid, autoStreak?, webNotify?, webPushSubscription? }
 *  - Trường hợp 3 (Xác thực lại / Lấy token):    { uid }
 */
export default async function verifyHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { email, password, uid, autoStreak, webNotify, webPushSubscription, action } = req.body || {};

  // =========================================================================
  // TRƯỜNG HỢP: Cập nhật cài đặt người dùng (Gộp từ settings API)
  // =========================================================================
  if (uid && (action === 'settings' || typeof autoStreak === 'boolean' || typeof webNotify === 'boolean' || webPushSubscription !== undefined)) {
    try {
      const updateData = {};
      if (typeof autoStreak === 'boolean') updateData.autoStreak = autoStreak;
      if (typeof webNotify === 'boolean') updateData.webNotify = webNotify;
      if (webPushSubscription !== undefined) updateData.webPushSubscription = webPushSubscription;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: 'Không có dữ liệu cài đặt hợp lệ để cập nhật.' });
      }

      if (db) {
        await db.collection('users').doc(uid).set(updateData, { merge: true });
      }

      return res.status(200).json({
        success: true,
        message: 'Cập nhật cài đặt thành công.',
        settings: updateData
      });
    } catch (error) {
      console.error('[API Verify] Lỗi cập nhật cài đặt:', error.message);
      return res.status(500).json({
        success: false,
        message: `Lỗi cập nhật cài đặt: ${error.message}`
      });
    }
  }

  // =========================================================================
  // TRƯỜNG HỢP 1: Xác thực bằng Email & Mật khẩu
  // =========================================================================
  if (email && password) {
    if (!email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp Email hợp lệ.' });
    }

    try {
      const loginResult = await loginWithEmailPassword(email.trim().toLowerCase(), password);
      const userUid = loginResult.uid;
      const finalEmail = loginResult.email || email.trim().toLowerCase();
      const now = getVietnamTime();
      // Lấy thông tin hồ sơ Locket 1 lần duy nhất lúc đăng nhập để lưu vào DB (tránh gọi fetchUser sau này)
      let displayName = finalEmail.split('@')[0];
      let username = null;
      let avatarUrl = null;
      let streakCount = 0;
      let lastStreakDate = 0;

      try {
        const headers = getRandomLocketHeaders(loginResult.idToken);
        const [uRes, mRes] = await Promise.all([
          fetch(`${LOCKET_API_URL}/fetchUserV2`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ data: { user_uid: userUid } })
          }),
          fetch(`${LOCKET_API_URL}/getLatestMomentV2`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ data: { excluded_users: [], fetch_streak: true, should_count_missed_moments: true } })
          })
        ]);

        if (uRes.ok) {
          const uJson = await uRes.json();
          const uData = (uJson?.result || uJson)?.data || {};
          const fullName = [uData.first_name, uData.last_name].filter(Boolean).join(' ').trim();
          displayName = fullName || uData.username || displayName;
          username = uData.username || null;
          avatarUrl = uData.profile_picture_url || null;
        }

        if (mRes.ok) {
          const mJson = await mRes.json();
          const sObj = (mJson?.result || mJson)?.streak || {};
          streakCount = Number(sObj.count) || 0;
          lastStreakDate = Number(sObj.last_updated_yyyymmdd) || 0;
        }
      } catch (err) {
        console.warn('[Verify] Không thể lấy profile ngay khi đăng nhập:', err.message);
      }

      const today = getVietnamTodayNumber();
      const isMaintainedToday = streakCount > 0 && lastStreakDate >= today;

      let firstLoginAt = now;
      let sessionSecret = crypto.randomBytes(16).toString('hex');

      if (db) {
        const userRef = db.collection('users').doc(userUid);
        const userDoc = await userRef.get();

        const existingData = userDoc.exists ? userDoc.data() : {};
        firstLoginAt = existingData.firstLoginAt || now;
        sessionSecret = existingData.sessionSecret || sessionSecret;

        // Lưu thông tin người dùng và cấu hình vĩnh viễn vào Firestore
        await userRef.set({
          uid: userUid,
          email: finalEmail,
          displayName,
          username,
          avatarUrl,
          streakCount,
          lastStreakDate,
          isMaintainedToday,
          refreshToken: loginResult.refreshToken,
          idToken: loginResult.idToken,
          sessionSecret,
          firstLoginAt,
          lastLoginAt: now,
          autoStreak: existingData.autoStreak ?? false,
          telegramId: existingData.telegramId ?? null,
          discordId: existingData.discordId ?? null
        }, { merge: true });
      }

      return res.status(200).json({
        success: true,
        message: 'Xác thực tài khoản thành công!',
        data: {
          uid: userUid,
          email: finalEmail,
          displayName,
          username,
          avatarUrl,
          streakCount,
          lastStreakDate,
          isMaintainedToday,
          sessionSecret,
          firstLoginAt,
          lastLoginAt: now
        }
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Xác thực tài khoản thất bại.'
      });
    }
  }

  // =========================================================================
  // TRƯỜNG HỢP 2: Xác thực lại / Tự động cấp token bằng `uid`
  // =========================================================================
  if (uid) {
    try {
      const { userData, refreshed } = await getValidToken(uid);
      return res.status(200).json({
        success: true,
        message: refreshed ? 'Làm mới phiên làm việc thành công.' : 'Xác thực phiên làm việc thành công.',
        data: {
          uid,
          email: userData.email,
          firstLoginAt: userData.firstLoginAt,
          lastLoginAt: userData.lastLoginAt,
          refreshed
        }
      });
    } catch (error) {
      const status = error.message.includes('không tồn tại') ? 404 :
        error.message.includes('gián đoạn') ? 503 :
          error.message.includes('hết hạn') ? 401 : 400;
      return res.status(status).json({
        success: false,
        message: error.message || 'Xác thực phiên làm việc thất bại.'
      });
    }
  }

  // Không có thông tin hợp lệ
  return res.status(400).json({
    success: false,
    message: 'Yêu cầu không hợp lệ. Vui lòng cung cấp thông tin xác thực.'
  });
}

/**
 * Lấy idToken hợp lệ (tự động làm mới nếu >= 55 phút)
 */
export async function getValidToken(uid) {
  if (!db) {
    throw new Error('Dịch vụ xác thực tạm thời gián đoạn. Vui lòng thử lại sau.');
  }

  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new Error('Tài khoản không tồn tại hoặc phiên xác thực đã hết hạn.');
  }

  const userData = userDoc.data();
  const { refreshToken, idToken, lastLoginAt } = userData;

  const lastLoginMs = parseVietnamTimeToMs(lastLoginAt);
  const isUnder55Min = idToken && (Date.now() - lastLoginMs < 55 * 60 * 1000);

  if (isUnder55Min) {
    return { idToken, userData, userRef, refreshed: false };
  }

  if (!refreshToken) {
    throw new Error('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
  }

  const refreshResult = await refreshIdToken(refreshToken);
  const now = getVietnamTime();

  const updateData = {
    idToken: refreshResult.idToken,
    lastLoginAt: now
  };

  if (refreshResult.refreshToken && refreshResult.refreshToken !== refreshToken) {
    updateData.refreshToken = refreshResult.refreshToken;
  }

  await userRef.set(updateData, { merge: true });

  return {
    idToken: refreshResult.idToken,
    userData: { ...userData, ...updateData },
    userRef,
    refreshed: true
  };
}
