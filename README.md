<div align="center">

# Locket Streak

**Tự động khôi phục & duy trì chuỗi Locket mỗi ngày**

[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[![Stars](https://img.shields.io/github/stars/huyvu2512/locket-streak?style=flat-square&label=Stars&color=FFCC00)](https://github.com/huyvu2512/locket-streak/stargazers)
[![Forks](https://img.shields.io/github/forks/huyvu2512/locket-streak?style=flat-square&label=Forks&color=6e7681)](https://github.com/huyvu2512/locket-streak/forks)
[![Issues](https://img.shields.io/github/issues/huyvu2512/locket-streak?style=flat-square&label=Issues&color=f85149)](https://github.com/huyvu2512/locket-streak/issues)
[![Last Commit](https://img.shields.io/github/last-commit/huyvu2512/locket-streak?style=flat-square&label=Last%20Commit&color=3fb950)](https://github.com/huyvu2512/locket-streak/commits/main)
![Visitors](https://visitor-badge.laobi.icu/badge?page_id=huyvu2512.locket-streak&left_text=Visitors&left_color=6e7681&right_color=FFCC00)

[Xem Website](https://streak.huyvu2512.io.vn/) · [Báo Lỗi](https://github.com/huyvu2512/locket-streak/issues) · [Yêu Cầu Tính Năng](https://github.com/huyvu2512/locket-streak/issues)

</div>

---

<div align="center">
  <img src="public/assets/preview.png" alt="Giao diện Locket Streak" width="100%">
</div>

---

## Giới thiệu

Locket Streak là giải pháp tự động hóa toàn diện giúp duy trì và khôi phục chuỗi bạn bè trên nền tảng Locket mỗi ngày. Sản phẩm được thiết kế và phát triển bởi Huy Vũ (@huyvu2512) với mục tiêu nghiên cứu chuyên sâu về giao thức xác thực di động, cơ chế truyền thông đám mây bảo mật và tối ưu hóa trải nghiệm tự động hóa cá nhân.

Hệ thống hoạt động trực tiếp qua giao thức API Locket và cơ sở dữ liệu Firebase Cloud Firestore. Toàn bộ phiên đăng nhập được mã hóa và lưu trữ an toàn; quy trình duy trì chuỗi được tối ưu nhằm tránh spam bảng tin bạn bè bằng cơ chế tự động dọn dẹp khoảnh khắc (moment) ngay sau khi máy chủ Locket ghi nhận thành công.

---

## Tính năng chính

- **Duy trì chuỗi tự động mỗi ngày** - Tự động kiểm tra trạng thái chuỗi và gửi tín hiệu duy trì cho ngày hiện tại theo thời gian thực (múi giờ Việt Nam UTC+7).
- **Khôi phục chuỗi bị gián đoạn** - Nhận diện ngày bị đứt chuỗi gần nhất và thực hiện khôi phục chuỗi tự động theo đúng cơ chế của Locket.
- **Tự động dọn dẹp khoảnh khắc** - Xóa bài đăng tạm thời ngay sau khi Locket cộng chuỗi thành công, đảm bảo bảng tin cá nhân và bạn bè luôn sạch sẽ.
- **Lưu trữ phiên bảo mật cao** - Toàn bộ thông tin phiên làm việc được mã hóa trong Firebase Firestore, không để lộ thông tin xác thực ra ngoài API.
- **Thông báo đa nền tảng** - Gửi kết quả chạy chuỗi và khôi phục chi tiết qua bot Telegram và Discord Webhook cá nhân.
- **Hỗ trợ phím tắt iOS** - Cung cấp phím tắt Apple Shortcuts cho iPhone để kích hoạt giữ chuỗi 1 chạm hoặc lập lịch tự động bằng Automation trên iOS.
- **Tương thích ứng dụng PWA** - Hỗ trợ cài đặt trực tiếp ra màn hình chính trên máy tính, Android và iPhone với biểu tượng và nhận diện thương hiệu chuẩn Locket Streak.
- **Tích hợp GitHub Actions & Cron Worker** - Kiến trúc tách biệt API hàng đợi (/api/cron) và API thực thi (/api/run), hỗ trợ chạy tự động qua GitHub Actions mà không gặp sự cố timeout.

---

## Kiến trúc hệ thống

- **Core Runtime**: Node.js v18+ với ES Modules.
- **Web Framework**: Express.js phục vụ API và Static Assets.
- **Cơ sở dữ liệu**: Firebase Cloud Firestore lưu trữ thông tin tài khoản và cấu hình thông báo.
- **Giao thức mạng**: HTTPS Fetch tương thích chuẩn giao tiếp iOS Locket Client.
- **Giao diện người dùng**: Vanilla HTML5, CSS3, JavaScript thuần, không phụ thuộc thư viện nặng.
- **Hạ tầng triển khai**: Tương thích hoàn toàn với nền tảng Vercel Serverless và máy chủ Node.js tự lưu trữ.

---

## Hướng dẫn cài đặt & Khởi chạy cục bộ

### Yêu cầu hệ thống

- Node.js phiên bản 18.0.0 trở lên.
- Trình quản lý gói npm.
- Dự án Firebase Firestore đã kích hoạt.

### Các bước thực hiện

1. Tải mã nguồn về máy:
```bash
git clone https://github.com/huyvu2512/locket-streak.git
cd locket-streak
```

2. Cài đặt các gói phụ thuộc:
```bash
npm install
```

3. Thiết lập biến môi trường:
Tạo file `.env` tại thư mục gốc dựa theo mẫu `.env.example` và điền các thông số tương ứng:
```env
# System
API_BASE_URL=
CRON_SECRET=

# Locket Configuration
LOCKET_FIREBASE_KEY=
LOCKET_API_URL=
LOCKET_AUTH_URL=
LOCKET_REFRESH_TOKEN_URL=
LOCKET_STORAGE_URL=
LOCKET_STORAGE_BUCKET=
LOCKET_BUNDLE_ID=
LOCKET_CLIENT_VERSION=

# Firebase Firestore
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Telegram Bot
TELEGRAM_BOT_USERNAME=
TELEGRAM_BOT_TOKEN=
```

4. Khởi chạy máy chủ phát triển:
```bash
npm run dev
```

Máy chủ sẽ khởi chạy tại địa chỉ: `http://localhost:3000`.

---

## Triển khai lên Vercel

1. Đẩy mã nguồn dự án lên kho lưu trữ GitHub cá nhân.
2. Đăng nhập vào trang quản trị Vercel và tiến hành Import Repository.
3. Trong phần cấu hình **Environment Variables** của dự án trên Vercel, sao chép toàn bộ các biến trong file `.env` vào cấu hình.
4. Bấm **Deploy**. Vercel sẽ tự động nhận diện cấu hình file `vercel.json` để phục vụ các trang giao diện và API Serverless.

---

## Tự động hóa với GitHub Actions

Để chuỗi được duy trì liên tục mà không phụ thuộc vào máy chủ cá nhân:

1. Mở Repository trên GitHub, truy cập **Settings** > **Secrets and variables** > **Actions**.
2. Thêm các Secrets cần thiết:
   - `API_BASE_URL`: Địa chỉ tên miền triển khai website của bạn (ví dụ: `https://streak.huyvu2512.io.vn`).
   - `CRON_SECRET`: Mã bí mật xác thực API bảo vệ dữ liệu hệ thống (khớp với biến trong file `.env` trên Vercel).
3. File workflow `.github/workflows/streak.yml` đã được thiết lập sẵn, hỗ trợ kích hoạt thủ công (workflow_dispatch) hoặc kích hoạt định kỳ qua Webhook từ các dịch vụ bên thứ 3 (cron-job.org, Upstash, EasyCron).

---

## Tác giả & Bản quyền

- Dự án được phát triển và duy trì bởi **Huy Vũ** ([@huyvu2512](https://github.com/huyvu2512)).
- Mã nguồn được phân phối theo giấy phép mã nguồn mở **MIT License**. Xem chi tiết tại tệp [LICENSE](./LICENSE).
