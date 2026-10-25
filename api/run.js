import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import { db } from '../lib/db.js';
import { getValidToken, getVietnamTodayNumber, getVietnamTime, formatVietnamDateTime, getRandomLocketHeaders, getRandomDelay, LOCKET_API_URL, LOCKET_STORAGE_URL, LOCKET_STORAGE_BUCKET } from './verify.js';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (_) {}
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Đọc ảnh logo của dự án và tải lên Firebase Storage (khu vực public)
 */
async function getOrUploadProjectLogo(idToken, uid) {
  try {
    const logoPath = path.join(rootDir, 'public', 'assets', 'logo.png');
    if (!fs.existsSync(logoPath)) return null;

    const logoBuffer = fs.readFileSync(logoPath);
    const md5Hash = crypto.createHash('md5').update(logoBuffer).digest('hex');

    const fileName = `${Date.now()}.png`;
    const storagePath = `users/${uid}/public/invite_link_previews/${fileName}`;
    const uploadUrl = `${LOCKET_STORAGE_URL}/v0/b/${LOCKET_STORAGE_BUCKET}/o?name=${encodeURIComponent(storagePath)}`;

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Firebase ${idToken}`,
        'Content-Type': 'image/png'
      },
      body: logoBuffer
    });

    if (res.ok) {
      const data = await res.json();
      if (data.downloadTokens) {
        const downloadUrl = `${LOCKET_STORAGE_URL}:443/v0/b/${LOCKET_STORAGE_BUCKET}/o/${encodeURIComponent(storagePath)}?alt=media&token=${data.downloadTokens}`;
        return { downloadUrl, md5Hash };
      }
    }
  } catch (err) {
    console.warn('[Run] Không thể upload logo dự án lên storage:', err.message);
  }
  return null;
}

/**
 * Tạo URL giả lập moment thumbnail hợp lệ theo định dạng Locket yêu cầu
 */
function generateMomentUrl(uid) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randId = '';
  for (let i = 0; i < 20; i++) randId += chars.charAt(Math.floor(Math.random() * chars.length));
  const randToken = crypto.randomUUID();
  return `${LOCKET_STORAGE_URL}:443/v0/b/${LOCKET_STORAGE_BUCKET}/o/users%2F${uid}%2Fmoments%2Fthumbnails%2F${randId}.webp?alt=media&token=${randToken}`;
}

/**
 * Xóa Moment sau khi Locket đã ghi nhận cộng chuỗi
 * (Giúp feed Locket của người dùng sạch sẽ, không bị lỗi "Không thể tải về ảnh")
 */
async function deleteMoment({ idToken, uid, momentUid }) {
  if (!momentUid) return;
  try {
    const delRes = await fetch(`${LOCKET_API_URL}/deleteMomentV2`, {
      method: 'POST',
      headers: getRandomLocketHeaders(idToken),
      body: JSON.stringify({
        data: {
          moment_uid: momentUid,
          owner_uid: uid,
          delete_globally: true
        }
      })
    });
    const delData = await delRes.json();
    if (delData?.result?.data) {
      console.log(`\x1b[90m  └─ [Moment] Đã tự động dọn dẹp moment (${momentUid.slice(0, 8)}...)\x1b[0m`);
    }
  } catch (err) {
    console.warn(`\x1b[33m  ⚠ [Moment] Lỗi khi dọn dẹp moment:\x1b[0m ${err.message}`);
  }
}

/**
 * Tính danh sách các ngày bị đứt chuỗi giữa ngày cập nhật cuối và hôm nay
 */
function getMissingDates(lastUpdatedYMD, todayYMD) {
  if (!lastUpdatedYMD || lastUpdatedYMD >= todayYMD) return [];
  const missing = [];
  const lastStr = String(lastUpdatedYMD);
  if (lastStr.length !== 8) return [];

  const y = parseInt(lastStr.slice(0, 4), 10);
  const m = parseInt(lastStr.slice(4, 6), 10) - 1;
  const d = parseInt(lastStr.slice(6, 8), 10);
  const lastUtc = Date.UTC(y, m, d);

  const ty = parseInt(String(todayYMD).slice(0, 4), 10);
  const tm = parseInt(String(todayYMD).slice(4, 6), 10) - 1;
  const td = parseInt(String(todayYMD).slice(6, 8), 10);
  const todayUtc = Date.UTC(ty, tm, td);

  const diffDays = Math.round((todayUtc - lastUtc) / (86400 * 1000));
  // Nếu khoảng cách > 6 ngày (tức đứt quá 5 ngày liên tiếp), dừng khôi phục để tránh spam quá nhiều moment
  if (diffDays > 6) return [];

  let cur = new Date(lastUtc);
  cur.setUTCDate(cur.getUTCDate() + 1);

  // Thử khôi phục tối đa lên đến 5 ngày gần nhất bị đứt (nếu Locket cho phép thì nối chuỗi, nếu không thì tạo chuỗi mới an toàn)
  let safety = 0;
  while (safety < 5) {
    const curYMD = parseInt(
      `${cur.getUTCFullYear()}${String(cur.getUTCMonth() + 1).padStart(2, '0')}${String(cur.getUTCDate()).padStart(2, '0')}`,
      10
    );
    if (curYMD >= todayYMD) break;
    missing.push(curYMD);
    cur.setUTCDate(cur.getUTCDate() + 1);
    safety++;
  }

  return missing;
}

/**
 * Gửi yêu cầu postMomentV2 lên Locket
 */
async function postMoment({ idToken, uid, isRestore = false, targetYMD, logoInfo = null }) {
  const formattedUrl = generateMomentUrl(uid);
  const md5Hash = logoInfo?.md5Hash || crypto.createHash('md5').update(formattedUrl).digest('hex');
  const imageUrl = logoInfo?.downloadUrl || formattedUrl;

  let timestampSeconds = Math.floor(Date.now() / 1000);
  if (isRestore && targetYMD) {
    const str = targetYMD.toString();
    if (str.length === 8) {
      const year = parseInt(str.substring(0, 4), 10);
      const month = parseInt(str.substring(4, 6), 10);
      const day = parseInt(str.substring(6, 8), 10);
      timestampSeconds = Math.floor(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getTime() / 1000);
    }
  }

  const payloadData = {
    thumbnail_url: formattedUrl,
    image_url: imageUrl,
    md5: md5Hash,
    sent_to_all: false,
    sent_to_self_only: true,
    caption: '',
    overlays: [],
    audience: 'all',
    recipients: [],
    date: {
      '@type': 'type.googleapis.com/google.protobuf.Int64Value',
      value: timestampSeconds.toString()
    }
  };

  if (isRestore) {
    payloadData.restore_streak_for_yyyymmdd = {
      '@type': 'type.googleapis.com/google.protobuf.Int64Value',
      value: targetYMD.toString()
    };
  } else {
    payloadData.update_streak_for_yyyymmdd = {
      '@type': 'type.googleapis.com/google.protobuf.Int64Value',
      value: targetYMD.toString()
    };
  }

  const res = await fetch(`${LOCKET_API_URL}/postMomentV2`, {
    method: 'POST',
    headers: getRandomLocketHeaders(idToken),
    body: JSON.stringify({ data: payloadData })
  });

  const data = await res.json();
  const result = data?.result || data;

  if (!res.ok || (result?.errors && result.errors.length > 0)) {
    const errMsg = result?.errors?.[0] || 'Lỗi khi gọi Locket postMomentV2';
    return { success: false, error: errMsg, raw: data };
  }

  // Tự động xóa Moment ngay sau khi Locket đã cộng chuỗi xong (delay 300ms đảm bảo multi-region Firestore đồng bộ hoàn tất)
  const momentUid = result?.data?.canonical_uid;
  if (momentUid) {
    await new Promise(res => setTimeout(res, 300));
    await deleteMoment({ idToken, uid, momentUid });
  }

  return {
    success: true,
    data: result.data || result,
    streak: result.streak || null
  };
}

/**
 * Gửi thông báo đến Telegram & Discord cho từng lần khôi phục hoặc duy trì chuỗi
 */
async function sendNotification({ userData, actionType, streakCount, dateYMD = 0 }) {
  const isRestore = actionType === 'restore';
  const accountName = userData.displayName || userData.username || userData.email || 'Tài khoản Locket';
  const currentTime = formatVietnamDateTime();

  // Định dạng ngày khôi phục / duy trì cụ thể dạng DD/MM/YYYY
  const targetDateStr = (dateYMD && String(dateYMD).length === 8)
    ? `${String(dateYMD).slice(6, 8)}/${String(dateYMD).slice(4, 6)}/${String(dateYMD).slice(0, 4)}`
    : currentTime;

  // 1. Telegram Notification
  if (userData.telegramId && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      let msg = '';
      if (isRestore) {
        msg = `⚡ Khôi phục chuỗi thành công!\n\nTài khoản: ${accountName}\nNgày khôi phục: ${targetDateStr}\nChuỗi: ${streakCount} ngày`;
      } else if (actionType === 'already_updated') {
        msg = `⚡ Đã ghi nhận chuỗi Locket!\n\nTài khoản: ${accountName}\nNgày: ${targetDateStr}\nChuỗi: ${streakCount} ngày\nTrạng thái: Đã tự duy trì trong ứng dụng.`;
      } else {
        msg = `🔥 Duy trì chuỗi thành công!\n\nTài khoản: ${accountName}\nNgày: ${targetDateStr}\nChuỗi: ${streakCount} ngày`;
      }

      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: userData.telegramId,
          text: msg
        })
      });
    } catch (e) {
      console.warn('[Run] Lỗi gửi Telegram:', e.message);
    }
  }

  // 2. Discord Notification (Webhook)
  if (userData.discordId) {
    try {
      let title = 'Duy trì chuỗi thành công!';
      let description = `Tài khoản: ${accountName}\nNgày: ${targetDateStr}\nChuỗi: ${streakCount} ngày`;
      let color = 16753920; // Cam khi duy trì

      if (isRestore) {
        title = '⚡ Khôi phục chuỗi thành công!';
        description = `Tài khoản: ${accountName}\nNgày khôi phục: ${targetDateStr}\nChuỗi: ${streakCount} ngày`;
        color = 7506394; // Tím/Xanh khi khôi phục
      } else if (actionType === 'already_updated') {
        title = '⚡ Đã ghi nhận chuỗi Locket!';
        description = `Tài khoản: ${accountName}\nNgày: ${targetDateStr}\nChuỗi: ${streakCount} ngày\nTrạng thái: Đã tự duy trì trong ứng dụng.`;
        color = 3066993; // Xanh ngọc lục bảo (Emerald Green)
      }

      await fetch(userData.discordId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Locket Streak',
          embeds: [{
            title,
            description,
            color,
            footer: {
              text: `Locket Streak • ${currentTime}`
            }
          }]
        })
      });
    } catch (e) {
      console.warn('[Run] Lỗi gửi Discord:', e.message);
    }
  }

  // 3. Web Push Notification (Chỉ gửi đến các thiết bị đã đăng ký cho đúng UID này)
  if (userData.uid && db && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    try {
      const subsSnapshot = await db.collection('users').doc(userData.uid).collection('subscriptions').get();
      if (!subsSnapshot.empty) {
        let pushTitle = '🔥 Duy trì chuỗi thành công!';
        let pushBody = `${accountName} • Chuỗi ${streakCount} ngày • ${currentTime}`;

        if (isRestore) {
          pushTitle = '⚡ Khôi phục chuỗi thành công!';
          pushBody = `${accountName} • Khôi phục ngày ${targetDateStr} • Chuỗi ${streakCount} ngày`;
        } else if (actionType === 'already_updated') {
          pushTitle = '⚡ Đã ghi nhận chuỗi Locket!';
          pushBody = `${accountName} • Chuỗi ${streakCount} ngày (Đã tự duy trì) • ${currentTime}`;
        }

        const payload = JSON.stringify({
          title: pushTitle,
          body: pushBody,
          icon: '/assets/icon-192.png',
          badge: '/assets/icon-192.png',
          data: { url: '/dashboard', uid: userData.uid }
        });

        const sendPromises = subsSnapshot.docs.map(async (doc) => {
          const subData = doc.data();
          if (!subData.endpoint || !subData.keys) return;
          try {
            await webpush.sendNotification({
              endpoint: subData.endpoint,
              keys: subData.keys
            }, payload);
          } catch (err) {
            // Nếu thiết bị đã huỷ quyền hoặc không tồn tại (410 / 404), tự động dọn dẹp subscription
            if (err.statusCode === 410 || err.statusCode === 404) {
              await doc.ref.delete().catch(() => null);
            }
          }
        });

        await Promise.allSettled(sendPromises);
      }
    } catch (e) {
      console.warn('[Run] Lỗi gửi Web Push:', e.message);
    }
  }
}

/**
 * Gửi thông báo lỗi đến Telegram, Discord & Web Push khi quá trình chạy chuỗi thất bại
 */
async function sendErrorNotification({ userData, errorMsg }) {
  if (!userData) return;
  const accountName = userData.displayName || userData.username || userData.email || 'Tài khoản Locket';
  const currentTime = formatVietnamDateTime();
  const cleanError = (errorMsg || 'Không xác định được nguyên nhân').trim();

  // 1. Telegram
  if (userData.telegramId && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const msg = `🚨 Chạy chuỗi thất bại!\n\nTài khoản: ${accountName}\nThời gian: ${currentTime}\nChi tiết lỗi: ${cleanError}\nVui lòng liên hệ cho AD để được hỗ trợ!`;
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: userData.telegramId,
          text: msg
        })
      });
    } catch (e) {
      console.warn('[Run] Lỗi gửi thông báo lỗi Telegram:', e.message);
    }
  }

  // 2. Discord
  if (userData.discordId) {
    try {
      await fetch(userData.discordId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Locket Streak',
          embeds: [{
            title: '🚨 Chạy chuỗi thất bại!',
            description: `Tài khoản: ${accountName}\nThời gian: ${currentTime}\nChi tiết lỗi: ${cleanError}\nVui lòng liên hệ cho AD để được hỗ trợ!`,
            color: 15548997, // Đỏ cảnh báo #ED4245
            footer: {
              text: `Locket Streak • ${currentTime}`
            }
          }]
        })
      });
    } catch (e) {
      console.warn('[Run] Lỗi gửi thông báo lỗi Discord:', e.message);
    }
  }

  // 3. Web Push Error
  if (userData.uid && db && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    try {
      const subsSnapshot = await db.collection('users').doc(userData.uid).collection('subscriptions').get();
      if (!subsSnapshot.empty) {
        const payload = JSON.stringify({
          title: '🚨 Chạy chuỗi thất bại!',
          body: `${accountName}: ${cleanError}`,
          icon: '/assets/icon-192.png',
          badge: '/assets/icon-192.png',
          data: { url: '/dashboard', uid: userData.uid }
        });

        const sendPromises = subsSnapshot.docs.map(async (doc) => {
          const subData = doc.data();
          if (!subData.endpoint || !subData.keys) return;
          try {
            await webpush.sendNotification({
              endpoint: subData.endpoint,
              keys: subData.keys
            }, payload);
          } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await doc.ref.delete().catch(() => null);
            }
          }
        });

        await Promise.allSettled(sendPromises);
      }
    } catch (e) {
      console.warn('[Run] Lỗi gửi Web Push lỗi:', e.message);
    }
  }
}


/**
 * API Chạy Chuỗi (Thủ công / Cron Tự động)
/**
 * Hàm thực thi cộng / khôi phục chuỗi cho 1 UID người dùng
 * (Dùng chung cho cả Chạy thủ công /api/run và Cron Tự Động /api/cron)
 */
export async function executeStreakForUser(uid) {
  if (!uid) {
    throw new Error('Thiếu UID người dùng.');
  }

  let userObj = null;

  try {
    const { idToken, userData } = await getValidToken(uid);
    userObj = userData;
    const todayYMD = getVietnamTodayNumber();

    // Chuẩn bị logo dự án để đăng
    const logoInfo = await getOrUploadProjectLogo(idToken, uid);

    // 1. Kiểm tra chuỗi hiện tại của user từ Locket
    let lastUpdatedYMD = 0;
    let currentStreakCount = 0;

    try {
      const momentCheck = await fetch(`${LOCKET_API_URL}/getLatestMomentV2`, {
        method: 'POST',
        headers: getRandomLocketHeaders(idToken),
        body: JSON.stringify({
          data: {
            excluded_users: [],
            fetch_streak: true,
            should_count_missed_moments: true
          }
        })
      });

      if (momentCheck.ok) {
        const mData = await momentCheck.json();
        const streakObj = mData?.result?.streak || mData?.streak || {};
        currentStreakCount = Number(streakObj.count) || 0;
        lastUpdatedYMD = Number(streakObj.last_updated_yyyymmdd) || 0;
      }
    } catch (err) {
      console.warn(`\x1b[33m  ⚠ [Streak] Lỗi đọc chuỗi hiện tại (${uid.slice(0, 8)}...):\x1b[0m`, err.message);
    }

    const restoredDates = [];
    let updatedToday = false;
    let latestStreak = currentStreakCount;

    // 2. Tìm các ngày bị đứt chuỗi và thực hiện khôi phục
    const missingDates = getMissingDates(lastUpdatedYMD, todayYMD);
    for (let i = 0; i < missingDates.length; i++) {
      const missedYMD = missingDates[i];
      const restoreRes = await postMoment({
        idToken,
        uid,
        isRestore: true,
        targetYMD: missedYMD,
        logoInfo
      });

      if (restoreRes.success) {
        if (restoreRes.streak?.count) {
          latestStreak = Number(restoreRes.streak.count);
        } else {
          latestStreak += 1;
        }
        restoredDates.push(missedYMD);
        console.log(`\x1b[32m  ✔ [Streak] Khôi phục ngày ${missedYMD} (${uid.slice(0, 8)}...): ${latestStreak} ngày\x1b[0m`);

        // Gửi thông báo cho từng ngày khôi phục
        await sendNotification({
          userData,
          actionType: 'restore',
          dateYMD: missedYMD,
          streakCount: latestStreak
        });
      } else {
        console.warn(`\x1b[33m  ⚠ [Streak] Khôi phục ngày ${missedYMD} (${uid.slice(0, 8)}...) thất bại:\x1b[0m`, restoreRes.error);
      }

      // Nghỉ nhẹ 800 - 1500ms giữa các ngày khôi phục để Locket xử lý tuần tự
      if (i < missingDates.length - 1) {
        await getRandomDelay(800, 1500);
      }
    }

    // 3. Thực hiện cập nhật chuỗi cho ngày hôm nay (chỉ chạy khi hôm nay CHƯA có chuỗi)
    const isAlreadyUpdatedToday = (lastUpdatedYMD === todayYMD);

    if (!isAlreadyUpdatedToday) {
      if (restoredDates.length > 0) {
        // Nghỉ nhẹ 800 - 1500ms sau khi khôi phục ngày cũ trước khi cộng ngày hôm nay
        await getRandomDelay(800, 1500);
      }

      const todayRes = await postMoment({
        idToken,
        uid,
        isRestore: false,
        targetYMD: todayYMD,
        logoInfo
      });

      if (todayRes.success) {
        if (todayRes.streak?.count) {
          latestStreak = Number(todayRes.streak.count);
        } else {
          latestStreak += 1;
        }
        updatedToday = true;
        console.log(`\x1b[32m  ✔ [Streak] Duy trì chuỗi thành công (${uid.slice(0, 8)}...): ${latestStreak} ngày\x1b[0m`);

        // Chỉ gửi thông báo khi thực sự cập nhật chuỗi mới cho hôm nay
        await sendNotification({
          userData,
          actionType: 'update',
          dateYMD: todayYMD,
          streakCount: latestStreak
        });
      } else {
        if (restoredDates.length === 0) {
          throw new Error(todayRes.error || 'Cập nhật chuỗi hôm nay thất bại.');
        }
      }
    } else {
      // Nếu hôm nay đã có chuỗi rồi và cũng không có ngày nào cần khôi phục
      if (restoredDates.length === 0) {
        // Kiểm tra xem hôm nay tài khoản này đã được gửi thông báo chuỗi chưa
        const lastNotifiedDate = Number(userData.lastStreakNotifiedDate) || 0;
        let notified = false;

        if (lastNotifiedDate !== todayYMD) {
          // Lần đầu tiên phát hiện hôm nay đã có chuỗi do người dùng tự chụp trong app
          await sendNotification({
            userData,
            actionType: 'already_updated',
            streakCount: latestStreak
          });
          notified = true;
        }

        if (db) {
          const updateData = {
            lastStreakRunAt: getVietnamTime(),
            lastStreakStatus: 'already_updated',
            streakCount: latestStreak,
            lastStreakDate: todayYMD,
            lastStreakNotifiedDate: todayYMD // Đánh dấu hôm nay đã thông báo (chỉ thông báo duy nhất 1 lần)
          };
          // Cố định mốc streakAchievedAt không bị ghi đè nếu hôm nay đã có
          if (!userData.streakAchievedAt || String(userData.lastStreakDate) !== String(todayYMD)) {
            updateData.streakAchievedAt = userData.streakAchievedAt || getVietnamTime();
          }
          await db.collection('users').doc(uid).set(updateData, { merge: true });
        }

        return {
          success: true,
          alreadyUpdated: true,
          restoredDates: [],
          updatedToday: false,
          streakCount: latestStreak,
          notified,
          message: notified
            ? `Chuỗi hôm nay (${latestStreak} ngày) đã được bạn tự duy trì trong ứng dụng Locket. Hệ thống đã ghi nhận và gửi thông báo!`
            : `Chuỗi hôm nay (${latestStreak} ngày) đã được duy trì trước đó rồi, không cần chạy lại.`
        };
      }
    }

    // 4. Cập nhật trạng thái thành công vào Firestore
    if (db) {
      const nowVn = getVietnamTime();
      await db.collection('users').doc(uid).set({
        lastStreakRunAt: nowVn,
        streakAchievedAt: nowVn, // Mốc thời gian hoàn thành chuỗi mới
        lastStreakStatus: 'success',
        streakCount: latestStreak,
        lastStreakDate: todayYMD,
        lastStreakNotifiedDate: todayYMD
      }, { merge: true });
    }

    const messages = [];
    if (restoredDates.length > 0) {
      messages.push(`Đã khôi phục thành công ${restoredDates.length} ngày`);
    }
    if (updatedToday) {
      messages.push('Duy trì chuỗi hôm nay thành công');
    }

    return {
      success: true,
      alreadyUpdated: false,
      restoredDates,
      updatedToday,
      streakCount: latestStreak,
      message: `${messages.join(' và ')}! Chuỗi hiện tại: ${latestStreak} ngày.`
    };
  } catch (error) {
    // Nếu chưa lấy được userData từ getValidToken thì đọc từ Firestore để có telegramId/discordId gửi báo lỗi
    if (!userObj && db) {
      try {
        const uDoc = await db.collection('users').doc(uid).get();
        if (uDoc.exists) userObj = uDoc.data();
      } catch (e) {}
    }

    if (userObj) {
      await sendErrorNotification({
        userData: userObj,
        errorMsg: error.message
      });
    }

    throw error;
  }
}


// Bộ nhớ đệm giới hạn tần suất (Rate Limit): 1 UID tối đa 1 lần mỗi 12 giây
const runCooldowns = new Map();
const COOLDOWN_MS = 12 * 1000;

/**
 * API Chạy Chuỗi Thủ Công
 * Method: POST /api/run
 * Body: { uid: string }
 */
export default async function runHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { uid } = req.body || {};
  const cleanUid = typeof uid === 'string' ? uid.trim() : '';

  // Kiểm tra định dạng UID Locket (Firebase UID hợp lệ: chuỗi chữ số 10-64 ký tự, không chứa khoảng trắng hay tiếng Việt)
  if (!cleanUid || !/^[a-zA-Z0-9_-]{10,64}$/.test(cleanUid)) {
    return res.status(400).json({
      success: false,
      message: 'Mã UID không hợp lệ hoặc chứa ký tự đặc biệt/khoảng trắng.'
    });
  }

  // Kiểm tra nếu request từ Cron Worker có CRON_SECRET thì bỏ qua giới hạn tần suất
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];
  const isCronAuth = Boolean(cronSecret && authHeader && authHeader.replace(/^Bearer\s+/i, '').trim() === cronSecret);

  const now = Date.now();
  const lastRunTime = runCooldowns.get(cleanUid);

  if (!isCronAuth && lastRunTime && (now - lastRunTime < COOLDOWN_MS)) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - lastRunTime)) / 1000);
    return res.status(429).json({
      success: false,
      cooldown: true,
      remaining,
      message: `Thao tác quá nhanh! Vui lòng đợi ${remaining} giây để thử lại.`
    });
  }

  // Ghi nhận mốc thời gian gọi
  runCooldowns.set(cleanUid, now);

  try {
    const result = await executeStreakForUser(cleanUid);
    return res.status(200).json(result);
  } catch (error) {
    console.error(`\x1b[31m  ✖ [Run Handler] Lỗi khi chạy cho ${cleanUid.slice(0, 8)}...:\x1b[0m`, error.message);

    const isExpired = error.message.includes('hết hạn') || error.message.includes('đăng xuất') || error.message.includes('tồn tại');

    if (db) {
      try {
        const uRef = db.collection('users').doc(cleanUid);
        const uDoc = await uRef.get();
        // CHỈ cập nhật thông tin lỗi nếu tài khoản THỰC SỰ tồn tại trong Firestore
        if (uDoc.exists) {
          const updateObj = {
            lastStreakRunAt: getVietnamTime(),
            lastStreakStatus: isExpired ? 'token_expired' : 'error',
            lastStreakError: error.message
          };
          if (isExpired) {
            updateObj.idToken = null;
            updateObj.refreshToken = null;
            updateObj.isSessionExpired = true;
            updateObj.autoStreak = false;
          }
          await uRef.update(updateObj);
        }
      } catch (e) {
        // ignore
      }
    }

    return res.status(isExpired ? 401 : 500).json({
      success: false,
      isSessionExpired: isExpired,
      message: error.message || 'Xảy ra lỗi trong quá trình chạy chuỗi.'
    });
  }
}
