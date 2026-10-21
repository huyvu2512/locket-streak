import { db } from './db.js';
import { executeStreakForUser } from './run.js';
import { getVietnamTime, getRandomDelay } from './verify.js';

/**
 * API Cron Tự Động Quét & Duy Trì Chuỗi Cho Toàn Bộ Tài Khoản Trong DB
 * Method: GET hoặc POST /api/cron
 * Headers (tùy chọn): Authorization: Bearer <CRON_SECRET>
 * Query (tùy chọn): ?key=<CRON_SECRET>
 */
export default async function cronHandler(req, res) {
  // 1. Kiểm tra xác thực bảo vệ dữ liệu UID bằng CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers['authorization'];
    const queryKey = req.query?.key;
    const secretHeader = req.headers['x-cron-secret'];
    const provided = (authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '') || secretHeader || queryKey;

    if (provided !== cronSecret) {
      // Trả về 404 Not Found để giả vờ như endpoint không tồn tại
      return res.status(404).json({ success: false, message: 'Not Found' });
    }
  }

  if (!db) {
    return res.status(503).json({
      success: false,
      message: 'Dịch vụ Firestore tạm thời gián đoạn. Vui lòng kiểm tra cấu hình DB.'
    });
  }

  try {
    // 2. Lấy toàn bộ tài khoản trong cơ sở dữ liệu
    const snapshot = await db.collection('users').get();
    if (snapshot.empty) {
      return res.status(200).json({
        success: true,
        message: 'Không tìm thấy tài khoản nào trong hệ thống.',
        summary: {
          total: 0,
          processed: 0,
          updatedToday: 0,
          alreadyUpdated: 0,
          restoredTotalDays: 0,
          failed: 0
        },
        details: []
      });
    }

    const allDocs = snapshot.docs;

    // Lọc danh sách nick cần chạy: CHỈ chạy các tài khoản đã BẬT tự động giữ chuỗi (autoStreak === true)
    // Mặc định tài khoản chưa bật auto sẽ được bỏ qua
    const targetDocs = allDocs.filter(d => Boolean(d.data()?.autoStreak));

    if (targetDocs.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Không có tài khoản nào đang bật chế độ tự động giữ chuỗi (autoStreak).',
        summary: {
          total: allDocs.length,
          processed: 0,
          updatedToday: 0,
          alreadyUpdated: 0,
          restoredTotalDays: 0,
          failed: 0
        },
        details: []
      });
    }

    // Nếu không yêu cầu chạy trực tiếp trên server (mặc định), trả về danh sách UID để Worker (GitHub Actions) chạy tuần tự
    const isRunMode = req.query?.action === 'run' || req.query?.run === 'true' || req.body?.action === 'run';

    if (!isRunMode) {
      const uids = targetDocs.map(d => d.id);

      return res.status(200).json({
        success: true,
        mode: 'queue',
        timestamp: getVietnamTime(),
        total: allDocs.length,
        count: uids.length,
        uids
      });
    }

    // Chế độ chạy trực tiếp tuần tự trên server (nếu gọi với ?action=run)
    const details = [];
    let updatedTodayCount = 0;
    let alreadyUpdatedCount = 0;
    let restoredTotalDays = 0;
    let failedCount = 0;

    console.log(`\x1b[36m➜\x1b[0m \x1b[1m[Cron Server]\x1b[0m Bắt đầu quét chuỗi cho ${targetDocs.length} tài khoản lúc ${getVietnamTime()}...`);

    // 3. Thực thi tuần tự từng tài khoản với khoảng nghỉ nhỏ để tránh chạm rate limit Locket
    for (let i = 0; i < targetDocs.length; i++) {
      const doc = targetDocs[i];
      const uid = doc.id;
      const userData = doc.data() || {};
      const identifier = userData.email || uid;

      try {
        const result = await executeStreakForUser(uid);

        if (result.alreadyUpdated) {
          alreadyUpdatedCount++;
          details.push({
            uid,
            account: identifier,
            status: 'already_updated',
            streakCount: result.streakCount,
            message: result.message
          });
        } else {
          if (result.updatedToday) updatedTodayCount++;
          if (result.restoredDates?.length > 0) restoredTotalDays += result.restoredDates.length;

          details.push({
            uid,
            account: identifier,
            status: 'success',
            updatedToday: result.updatedToday,
            restoredDates: result.restoredDates || [],
            streakCount: result.streakCount,
            message: result.message
          });
        }
      } catch (err) {
        failedCount++;
        console.error(`\x1b[31m  ✖ [Cron Server] Lỗi tài khoản ${identifier}:\x1b[0m`, err.message);
        details.push({
          uid,
          account: identifier,
          status: 'error',
          error: err.message
        });
      }

      // Nghỉ ngẫu nhiên 1.5s - 3.2s giữa các tài khoản để mô phỏng hành vi tự nhiên
      if (i < targetDocs.length - 1) {
        await getRandomDelay(1500, 3200);
      }
    }

    console.log(`\x1b[32m✔\x1b[0m \x1b[1m[Cron Server]\x1b[0m Hoàn tất: ${updatedTodayCount} mới, ${alreadyUpdatedCount} đã có, ${restoredTotalDays} khôi phục, ${failedCount} lỗi.`);

    return res.status(200).json({
      success: true,
      mode: 'direct_run',
      timestamp: getVietnamTime(),
      summary: {
        total: allDocs.length,
        processed: targetDocs.length,
        updatedToday: updatedTodayCount,
        alreadyUpdated: alreadyUpdatedCount,
        restoredTotalDays,
        failed: failedCount
      },
      details
    });

  } catch (error) {
    console.error('[Cron Job] Lỗi tổng quát:', error.message);
    return res.status(500).json({
      success: false,
      message: `Lỗi trong quá trình chạy cron job: ${error.message}`
    });
  }
}
