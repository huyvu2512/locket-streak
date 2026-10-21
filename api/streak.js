import { getValidToken, getVietnamTodayNumber, getRandomLocketHeaders, LOCKET_API_URL } from './verify.js';

/**
 * API Lấy Thông Tin Chuỗi & Cài Đặt Tài Khoản
 * Method: POST /api/streak
 * Body: { uid: string }
 */
export default async function streakHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { uid } = req.body;
  if (!uid) {
    return res.status(400).json({
      success: false,
      message: 'Yêu cầu không hợp lệ. Vui lòng cung cấp UID người dùng.'
    });
  }

  try {
    const { idToken, userData } = await getValidToken(uid);

    const headers = getRandomLocketHeaders(idToken);

    // Lấy thông tin chuỗi từ Locket (thoải mái không bị limit)
    const momentPromise = fetch(`${LOCKET_API_URL}/getLatestMomentV2`, {
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

    // Chỉ gọi fetchUserV2 nếu trong DB chưa có username hoặc displayName
    let displayName = userData.displayName || userData.email?.split('@')[0] || '';
    let username = userData.username || null;
    let avatarUrl = userData.avatarUrl || null;

    let userPromise = null;
    if (!userData.username && !userData.avatarUrl) {
      userPromise = fetch(`${LOCKET_API_URL}/fetchUserV2`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data: { user_uid: uid } })
      }).catch(() => null);
    }

    const [momentResRaw, userResRaw] = await Promise.all([momentPromise, userPromise]);

    // Xử lý thông tin chuỗi
    let streakCount = Number(userData.streakCount) || 0;
    let rawLastUpdated = Number(userData.lastStreakDate) || 0;
    if (momentResRaw && momentResRaw.ok) {
      const momentData = await momentResRaw.json();
      const streak = (momentData?.result || momentData)?.streak || {};
      streakCount = Number(streak.count) || 0;
      rawLastUpdated = Number(streak.last_updated_yyyymmdd) || 0;
    }

    const today = getVietnamTodayNumber();
    const isMaintainedToday = streakCount > 0 && rawLastUpdated >= today;
    const lastUpdated = (!rawLastUpdated || rawLastUpdated <= 19700101 || String(rawLastUpdated).startsWith('1970'))
      ? today
      : rawLastUpdated;

    // Xử lý thông tin hồ sơ nếu có gọi fetchUserV2
    if (userResRaw && userResRaw.ok) {
      const userRes = await userResRaw.json();
      const user = (userRes?.result || userRes)?.data || {};
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
      displayName = fullName || user.username || displayName;
      username = user.username || null;
      avatarUrl = user.profile_picture_url || null;
    }

    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin chuỗi thành công.',
      data: {
        uid,
        email: userData.email || null,
        profile: {
          displayName,
          username,
          avatarUrl
        },
        streak: {
          count: streakCount,
          lastUpdated,
          rawLastUpdated,
          isMaintainedToday
        },
        settings: {
          autoStreak: userData.autoStreak ?? false,
          telegramId: userData.telegramId ?? null,
          discordId: userData.discordId ?? null,
          discordWebhook: userData.discordWebhook ?? null
        },
        stats: {
          lastStreakRunAt: userData.lastStreakRunAt || userData.lastRunAt || null,
          lastStreakStatus: userData.lastStreakStatus || userData.lastRunStatus || null,
          lastLoginAt: userData.lastLoginAt || null,
          firstLoginAt: userData.firstLoginAt || null,
          createdAt: userData.createdAt || null,
          updatedAt: userData.updatedAt || null,
          tokenUpdatedAt: userData.tokenUpdatedAt || null,
          streakLastUpdatedInDb: userData.lastStreakDate || userData.streakLastUpdated || null,
          streakCountInDb: userData.streakCount ?? userData.lastStreakCount ?? null
        }
      }
    });

  } catch (error) {
    const status = error.message.includes('không tồn tại') ? 404 :
                   error.message.includes('gián đoạn') ? 503 :
                   error.message.includes('hết hạn') ? 401 : 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Không thể lấy thông tin chuỗi.'
    });
  }
}
