import { db } from '../api/db.js';

/**
 * Script Bảo Trì & Dọn Dẹp Cơ Sở Dữ Liệu (Firestore Cleanup & Integrity Check)
 * Chạy: node scripts/cleanup-db.js
 */
async function runCleanup() {
  if (!db) {
    console.error('✖ Không thể kết nối Firebase Cloud Firestore. Kiểm tra biến môi trường .env.');
    process.exit(1);
  }

  console.log('\n\x1b[36m====================================================\x1b[0m');
  console.log('\x1b[1m🔥 Locket Streak - Công Cụ Kiểm Tra & Dọn Dẹp Database\x1b[0m');
  console.log('\x1b[36m====================================================\x1b[0m\n');

  try {
    const usersSnap = await db.collection('users').get();
    console.log(`🔍 Tìm thấy tổng cộng: ${usersSnap.docs.length} tài liệu trong collection 'users'.\n`);

    let validCount = 0;
    let deletedCount = 0;
    let autoCount = 0;
    let teleCount = 0;
    let discordCount = 0;

    for (const doc of usersSnap.docs) {
      const id = doc.id;
      const data = doc.data() || {};

      // Kiểm tra định dạng Firebase UID hợp lệ (10-64 ký tự, không chứa khoảng trắng hoặc ký tự đặc biệt)
      const isValidUid = /^[a-zA-Z0-9_-]{10,64}$/.test(id);

      if (!isValidUid || id.includes(' ') || id === 'UID của bạn') {
        console.log(`\x1b[31m✖ Phát hiện document rác không hợp lệ ID: "${id}". Đang tiến hành xóa...\x1b[0m`);
        await db.collection('users').doc(id).delete();
        deletedCount++;
      } else {
        validCount++;
        if (data.autoStreak) autoCount++;
        if (data.telegramId) teleCount++;
        if (data.discordId) discordCount++;

        const name = data.displayName || data.username || data.email || 'N/A';
        const streak = data.streakCount || 0;
        console.log(`  ✔ [${id.slice(0, 8)}...] ${name.padEnd(25)} | Chuỗi: ${String(streak).padStart(3)} | Auto: ${data.autoStreak ? 'Bật' : 'Tắt'} | Tele: ${data.telegramId ? 'Đã liên kết' : 'Chưa'} | Discord: ${data.discordId ? 'Đã liên kết' : 'Chưa'}`);
      }
    }

    console.log('\n\x1b[32m================ THỐNG KÊ TOÀN VẸN =================\x1b[0m');
    console.log(`- Tài khoản hợp lệ:        ${validCount}`);
    console.log(`- Tài liệu rác đã dọn:     ${deletedCount}`);
    console.log(`- Bật tự động giữ chuỗi:   ${autoCount}`);
    console.log(`- Đã liên kết Telegram:    ${teleCount}`);
    console.log(`- Đã liên kết Discord:     ${discordCount}`);
    console.log('\x1b[32m====================================================\x1b[0m\n');

  } catch (err) {
    console.error('\x1b[31m✖ Lỗi khi thực hiện kiểm tra cơ sở dữ liệu:\x1b[0m', err.message);
    process.exit(1);
  }

  process.exit(0);
}

runCleanup();
