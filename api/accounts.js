import { db } from './db.js';
import { getValidToken, getVietnamTodayNumber, getRandomLocketHeaders, getRandomDelay, LOCKET_API_URL } from './verify.js';

/**
 * API Lấy Danh Sách & Đồng Bộ Hàng Loạt Tài Khoản (Batch Accounts API)
 * Tối ưu hóa: Hạn chế tối đa fetchUserV2 (chỉ fetch 1 lần khi DB chưa có để tránh rate limit của Locket)
 * Các tác vụ syncLive chỉ gọi getLatestMomentV2 (Streak API).
 * Method: POST hoặc GET /api/accounts
 */
export default async function accountsHandler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const payload = req.method === 'POST' ? req.body : req.query;
  const uids = payload?.uids;
  const syncLive = String(payload?.syncLive) === 'true';
  const botUsername = (process.env.TELEGRAM_BOT_USERNAME || 'LocketStreakBot').replace('@', '').trim();
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

    // 2. Chế độ đọc nhanh từ Firestore (syncLive = false): cực nhanh (< 150ms)
    // Tận dụng dữ liệu displayName, username, avatarUrl đã lưu trong DB, KHÔNG gọi fetchUserV2
    if (!syncLive) {
      const data = await Promise.all(targetDocs.map(async (doc) => {
        const u = doc.data() || {};
        let displayName = u.displayName || u.username || u.email?.split('@')[0] || 'Locket User';
        let username = u.username || null;
        let avatarUrl = u.avatarUrl || null;

        // Chỉ gọi fetchUserV2 duy nhất 1 lần khi tài khoản trong DB chưa từng có profile
        if (!u.username && !u.avatarUrl && !u.displayName) {
          try {
            const { idToken } = await getValidToken(doc.id);
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
        const isMaintainedToday = Boolean(u.isMaintainedToday || (rawLast && rawLast >= today));

        return {
          uid: doc.id,
          email: u.email || null,
          displayName,
          username,
          avatarUrl,
          streakCount,
          lastStreakDate: rawLast,
          isMaintainedToday,
          autoStreak: Boolean(u.autoStreak),
          telegramId: u.telegramId || null,
          discordId: u.discordId || null,
          lastStreakRunAt: u.lastStreakRunAt || null,
          lastStreakStatus: u.lastStreakStatus || null,
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
          const { idToken } = await getValidToken(uid);
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
            isMaintainedToday
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
            telegramId: userData.telegramId || null,
            discordId: userData.discordId || null,
            lastStreakRunAt: userData.lastStreakRunAt || null,
            lastStreakStatus: userData.lastStreakStatus || null,
            lastStreakNotifiedDate: Number(userData.lastStreakNotifiedDate) || 0
          };
        } catch (err) {
          console.warn(`[BatchAccounts] Lỗi quét chuỗi nick ${uid}:`, err.message);
          return {
            uid,
            email: userData.email || null,
            displayName,
            username,
            avatarUrl,
            streakCount: Number(userData.streakCount) || 0,
            lastStreakDate: Number(userData.lastStreakDate) || 0,
            isMaintainedToday: Number(userData.lastStreakDate) >= today,
            autoStreak: Boolean(userData.autoStreak),
            telegramId: userData.telegramId || null,
            discordId: userData.discordId || null,
            lastStreakRunAt: userData.lastStreakRunAt || null,
            lastStreakStatus: userData.lastStreakStatus || null,
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
