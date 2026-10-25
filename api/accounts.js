import { db } from '../lib/db.js';
import { getValidToken, verifyAndCleanSession, getVietnamTodayNumber, getRandomLocketHeaders, getRandomDelay, LOCKET_API_URL } from './verify.js';

/**
 * API Lấy Danh Sách & Đồng Bộ Hàng Loạt Tài Khoản (Batch Accounts API)
 * Tối ưu hóa: Hạn chế tối đa fetchUserV2 (chỉ fetch 1 lần khi DB chưa có để tránh rate limit của Locket)
 * Xác thực phiên token: Nếu tài khoản bị mất phiên / thu hồi token, tự động xóa token khỏi DB và đánh dấu isSessionExpired
 * Method: POST hoặc GET /api/accounts
 */
export default async function accountsHandler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const payload = req.method === 'POST' ? req.body : req.query;
  const uids = payload?.uids;
  const syncLive = String(payload?.syncLive) === 'true';
  const botUsername = (process.env.TELEGRAM_BOT_USERNAME || '').replace('@', '').trim();
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';

  if (!db) {
    return res.status(503).json({
      success: false,
      message: 'Dịch vụ cơ sở dữ liệu tạm thời gián đoạn.'
    });
  }

  try {
    const today = getVietnamTodayNumber();
    let targetDocs = [];

    // 1. Lấy dữ liệu tài khoản từ Firestore
    if (Array.isArray(uids) && uids.length > 0) {
      const validUids = uids.filter(Boolean);
      if (validUids.length > 0) {
        const docRefs = validUids.map(uid => db.collection('users').doc(uid));
        const snapshots = await db.getAll(...docRefs);
        targetDocs = snapshots.filter(s => s.exists);
      }
    } else {
      const snapshot = await db.collection('users').get();
      targetDocs = snapshot.docs;
    }

    if (targetDocs.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        syncedLive: false,
        data: []
      });
    }

    // 2. Chế độ đọc nhanh từ Firestore (syncLive = false):
    // Tận dụng dữ liệu displayName, username, avatarUrl đã lưu trong DB
    // Tự động kiểm tra tính hợp lệ của token và dọn sạch token nếu đã hết hạn
    if (!syncLive) {
      const data = await Promise.all(targetDocs.map(async (doc) => {
        const u = doc.data() || {};
        let displayName = u.displayName || u.username || u.email?.split('@')[0] || 'Locket User';
        let username = u.username || null;
        let avatarUrl = u.avatarUrl || null;

        // Xác thực phiên token thực tế với Google
        const sessionCheck = await verifyAndCleanSession(doc.id, u, doc.ref);
        const isSessionExpired = Boolean(sessionCheck.isSessionExpired);

        // Chỉ gọi fetchUserV2 duy nhất 1 lần khi tài khoản trong DB chưa từng có profile và phiên còn sống
        if (!isSessionExpired && !u.username && !u.avatarUrl && !u.displayName) {
          try {
            const idToken = sessionCheck.idToken || (await getValidToken(doc.id)).idToken;
            const headers = getRandomLocketHeaders(idToken);
            const uRes = await fetch(`${LOCKET_API_URL}/fetchUserV2`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ data: { user_uid: doc.id } })
            });
            if (uRes.ok) {
              const uJson = await uRes.json();
              const uData = (uJson?.result || uJson)?.data || {};
              const fullName = [uData.first_name, uData.last_name].filter(Boolean).join(' ').trim();
              displayName = fullName || uData.username || displayName;
              username = uData.username || null;
              avatarUrl = uData.profile_picture_url || null;

              // Lưu vĩnh viễn vào Firestore để không bao giờ phải gọi fetchUserV2 nữa
              await db.collection('users').doc(doc.id).set({
                displayName,
                username,
                avatarUrl
              }, { merge: true }).catch(() => {});
            }
          } catch (_) {}
        }

        const rawLast = Number(u.lastStreakDate) || 0;
        const streakCount = Number(u.streakCount) || 0;
        const isMaintainedToday = Boolean(!isSessionExpired && (u.isMaintainedToday || (rawLast && rawLast >= today)));

        return {
          uid: doc.id,
          email: u.email || null,
          displayName,
          username,
          avatarUrl,
          streakCount,
          lastStreakDate: rawLast,
          isMaintainedToday,
          autoStreak: isSessionExpired ? false : Boolean(u.autoStreak),
          isSessionExpired,
          telegramId: u.telegramId || null,
          discordId: u.discordId || null,
          lastStreakRunAt: u.lastStreakRunAt || null,
          streakAchievedAt: u.streakAchievedAt || (isMaintainedToday ? (u.lastStreakRunAt || null) : null),
          lastStreakStatus: isSessionExpired ? 'token_expired' : (u.lastStreakStatus || (isMaintainedToday ? 'already_updated' : null)),
          lastStreakNotifiedDate: Number(u.lastStreakNotifiedDate) || 0
        };
      }));

      return res.status(200).json({
        success: true,
        count: data.length,
        syncedLive: false,
        botUsername,
        vapidPublicKey,
        data
      });
    }

    // 3. Chế độ đồng bộ chuỗi trực tiếp từ Locket (syncLive = true):
    // CHỈ GỌI getLatestMomentV2 (Streak API) để lấy chuỗi mới nhất, TUYỆT ĐỐI KHÔNG gọi fetchUserV2 để tránh chạm rate limit
    const CONCURRENCY = 3;
    const results = [];

    for (let i = 0; i < targetDocs.length; i += CONCURRENCY) {
      const batch = targetDocs.slice(i, i + CONCURRENCY);

      const batchResults = await Promise.all(batch.map(async (doc) => {
        const uid = doc.id;
        const userData = doc.data() || {};
        const displayName = userData.displayName || userData.username || userData.email?.split('@')[0] || 'Locket User';
        const username = userData.username || null;
        const avatarUrl = userData.avatarUrl || null;

        try {
          const sessionCheck = await verifyAndCleanSession(uid, userData, doc.ref);
          if (sessionCheck.isSessionExpired) {
            return {
              uid,
              email: userData.email || null,
              displayName,
              username,
              avatarUrl,
              streakCount: Number(userData.streakCount) || 0,
              lastStreakDate: Number(userData.lastStreakDate) || 0,
              isMaintainedToday: false,
              autoStreak: false,
              isSessionExpired: true,
              telegramId: userData.telegramId || null,
              discordId: userData.discordId || null,
              lastStreakRunAt: userData.lastStreakRunAt || null,
              lastStreakStatus: 'token_expired',
              lastStreakNotifiedDate: Number(userData.lastStreakNotifiedDate) || 0,
              syncError: 'Phiên đăng nhập đã hết hạn.'
            };
          }

          const idToken = sessionCheck.idToken || (await getValidToken(uid)).idToken;
          const headers = getRandomLocketHeaders(idToken);

          // Chỉ gọi Streak API (không gọi fetchUserV2)
          const momentResRaw = await fetch(`${LOCKET_API_URL}/getLatestMomentV2`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              data: {
                excluded_users: [],
                fetch_streak: true,
                should_count_missed_moments: true
              }
            })
          });

          let streakCount = Number(userData.streakCount) || 0;
          let rawLastUpdated = Number(userData.lastStreakDate) || 0;

          if (momentResRaw.ok) {
            const momentData = await momentResRaw.json();
            const streak = (momentData?.result || momentData)?.streak || {};
            streakCount = Number(streak.count) || streakCount;
            rawLastUpdated = Number(streak.last_updated_yyyymmdd) || rawLastUpdated;
          }

          const isMaintainedToday = streakCount > 0 && rawLastUpdated >= today;

          // Cập nhật chuỗi mới vào Firestore
          const updatePayload = {
            streakCount,
            lastStreakDate: rawLastUpdated,
            isMaintainedToday,
            isSessionExpired: false
          };
          await db.collection('users').doc(uid).set(updatePayload, { merge: true }).catch(() => {});

          return {
            uid,
            email: userData.email || null,
            displayName,
            username,
            avatarUrl,
            streakCount,
            lastStreakDate: rawLastUpdated,
            isMaintainedToday,
            autoStreak: Boolean(userData.autoStreak),
            isSessionExpired: false,
            telegramId: userData.telegramId || null,
            discordId: userData.discordId || null,
            lastStreakRunAt: userData.lastStreakRunAt || null,
            streakAchievedAt: userData.streakAchievedAt || (isMaintainedToday ? (userData.lastStreakRunAt || null) : null),
            lastStreakStatus: userData.lastStreakStatus || (isMaintainedToday ? 'already_updated' : null),
            lastStreakNotifiedDate: Number(userData.lastStreakNotifiedDate) || 0
          };
        } catch (err) {
          console.warn(`[BatchAccounts] Lỗi quét chuỗi nick ${uid}:`, err.message);
          const isExpired = err.message.includes('hết hạn') || err.message.includes('đăng xuất') || !userData.refreshToken;
          return {
            uid,
            email: userData.email || null,
            displayName,
            username,
            avatarUrl,
            streakCount: Number(userData.streakCount) || 0,
            lastStreakDate: Number(userData.lastStreakDate) || 0,
            isMaintainedToday: false,
            autoStreak: false,
            isSessionExpired: isExpired,
            telegramId: userData.telegramId || null,
            discordId: userData.discordId || null,
            lastStreakRunAt: userData.lastStreakRunAt || null,
            lastStreakStatus: isExpired ? 'token_expired' : (userData.lastStreakStatus || null),
            lastStreakNotifiedDate: Number(userData.lastStreakNotifiedDate) || 0,
            syncError: err.message
          };
        }
      }));

      results.push(...batchResults);

      if (i + CONCURRENCY < targetDocs.length) {
        await getRandomDelay(400, 900);
      }
    }

    return res.status(200).json({
      success: true,
      count: results.length,
      syncedLive: true,
      botUsername,
      vapidPublicKey,
      data: results
    });

  } catch (error) {
    console.error('[BatchAccounts] Lỗi:', error.message);
    return res.status(500).json({
      success: false,
      message: `Lỗi xử lý danh sách tài khoản: ${error.message}`
    });
  }
}
