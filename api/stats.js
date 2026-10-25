import { db } from '../lib/db.js';
import { getVietnamTodayNumber, getVietnamTime } from './verify.js';

// Bộ nhớ đệm (Cache) 30 giây để giảm tải truy vấn Firestore
let cachedStats = null;
let lastCacheTime = 0;
const CACHE_MS = 30 * 1000;

export default async function statsHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const now = Date.now();
  if (cachedStats && (now - lastCacheTime < CACHE_MS)) {
    return res.status(200).json({
      success: true,
      cached: true,
      data: cachedStats
    });
  }

  if (!db) {
    return res.status(503).json({
      success: false,
      message: 'Cơ sở dữ liệu chưa sẵn sàng.'
    });
  }

  try {
    const snapshot = await db.collection('users').get();
    const todayYMD = getVietnamTodayNumber();

    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data() || {};
      const isMaintained = Boolean(data.isMaintainedToday || (data.lastStreakDate && data.lastStreakDate >= todayYMD));
      users.push({
        displayName: data.displayName || data.username || 'Người dùng Locket',
        username: data.username || null,
        avatarUrl: data.avatarUrl || null,
        streakCount: Number(data.streakCount) || 0,
        lastStreakDate: Number(data.lastStreakDate) || 0,
        lastStreakRunAt: data.lastStreakRunAt || null,
        streakAchievedAt: data.streakAchievedAt || (isMaintained ? data.lastStreakRunAt : null),
        autoStreak: Boolean(data.autoStreak),
        firstLoginAt: data.firstLoginAt || null,
        isMaintainedToday: isMaintained
      });
    });

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    const totalAccounts = users.length;
    const maintainedTodayCount = users.filter(u => u.isMaintainedToday).length;
    const autoStreakCount = users.filter(u => u.autoStreak).length;
    const totalStreakSum = users.reduce((sum, u) => sum + (u.streakCount > 0 ? u.streakCount : 0), 0);

    // Kỷ lục chuỗi cao nhất
    let maxStreakUser = null;
    let maxStreak = 0;
    for (const u of users) {
      if (u.streakCount > maxStreak) {
        maxStreak = u.streakCount;
        maxStreakUser = {
          displayName: u.displayName || 'Người dùng Locket',
          username: u.username ? `@${String(u.username).replace(/^@+/, '')}` : null,
          avatarUrl: u.avatarUrl || null,
          streakCount: u.streakCount
        };
      }
    }

    // Top 10 chuỗi cao nhất (Leaderboard)
    const topStreaks = [...users]
      .filter(u => u.streakCount > 0)
      .sort((a, b) => b.streakCount - a.streakCount)
      .slice(0, 10)
      .map((u, index) => ({
        rank: index + 1,
        displayName: u.displayName || 'Người dùng Locket',
        username: u.username ? `@${String(u.username).replace(/^@+/, '')}` : null,
        avatarUrl: u.avatarUrl || null,
        streakCount: Number(u.streakCount) || 0,
        isMaintainedToday: Boolean(u.isMaintainedToday),
        lastStreakDate: u.lastStreakDate || 0
      }));

    // Hàm phân tích thời gian an toàn
    const parseTime = (str) => {
      if (!str) return 0;
      try {
        if (typeof str !== 'string') return 0;
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
          return new Date(str.replace(' ', 'T') + '+07:00').getTime() || 0;
        }
        return new Date(str).getTime() || 0;
      } catch {
        return 0;
      }
    };

    // 1. Nhật ký duy trì chuỗi gần đây (Ưu tiên hiển thị mốc hoàn thành chuỗi streakAchievedAt)
    const streakLogs = users
      .filter(u => u.streakAchievedAt || u.lastStreakRunAt)
      .sort((a, b) => {
        const timeB = b.streakAchievedAt || b.lastStreakRunAt;
        const timeA = a.streakAchievedAt || a.lastStreakRunAt;
        return parseTime(timeB) - parseTime(timeA);
      })
      .slice(0, 15)
      .map(u => ({
        displayName: u.displayName || 'Người dùng Locket',
        username: u.username ? `@${String(u.username).replace(/^@+/, '')}` : null,
        avatarUrl: u.avatarUrl || null,
        streakCount: Number(u.streakCount) || 0,
        runAt: u.streakAchievedAt || u.lastStreakRunAt,
        action: 'streak_run'
      }));

    // 2. Nhật ký người dùng mới tham gia (Sắp xếp theo firstLoginAt mới nhất)
    const newMemberLogs = users
      .filter(u => u.firstLoginAt)
      .sort((a, b) => parseTime(b.firstLoginAt) - parseTime(a.firstLoginAt))
      .slice(0, 15)
      .map(u => ({
        displayName: u.displayName || 'Người dùng Locket',
        username: u.username ? `@${String(u.username).replace(/^@+/, '')}` : null,
        avatarUrl: u.avatarUrl || null,
        joinedAt: u.firstLoginAt,
        action: 'registered'
      }));

    const result = {
      summary: {
        totalAccounts,
        maintainedTodayCount,
        todayPercentage: totalAccounts > 0 ? Math.round((maintainedTodayCount / totalAccounts) * 100) : 0,
        totalStreakSum,
        maxStreak,
        maxStreakUser,
        autoStreakCount
      },
      topStreaks,
      recentLogs: streakLogs, // Bảo toàn tương thích ngược
      streakLogs,
      newMemberLogs,
      serverTime: getVietnamTime()
    };

    cachedStats = result;
    lastCacheTime = now;

    return res.status(200).json({
      success: true,
      cached: false,
      data: result
    });
  } catch (error) {
    console.error('[Stats API] Lỗi tính toán thống kê:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể tính toán dữ liệu thống kê.'
    });
  }
}
