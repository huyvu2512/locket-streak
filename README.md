<div align="center">

# Locket Streak

**Tự động khôi phục & duy trì chuỗi Locket mỗi ngày**

[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Web Push](https://img.shields.io/badge/Web%20Push-VAPID%20PWA-FF6B6B?logo=pwa&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[![Stars](https://img.shields.io/github/stars/huyvu2512/locket-streak?style=flat-square&label=Stars&color=FFCC00)](https://github.com/huyvu2512/locket-streak/stargazers)
[![Forks](https://img.shields.io/github/forks/huyvu2512/locket-streak?style=flat-square&label=Forks&color=6e7681)](https://github.com/huyvu2512/locket-streak/forks)
[![Issues](https://img.shields.io/github/issues/huyvu2512/locket-streak?style=flat-square&label=Issues&color=f85149)](https://github.com/huyvu2512/locket-streak/issues)
[![Last Commit](https://img.shields.io/github/last-commit/huyvu2512/locket-streak?style=flat-square&label=Last%20Commit&color=3fb950)](https://github.com/huyvu2512/locket-streak/commits/main)
![Visitors](https://visitor-badge.laobi.icu/badge?page_id=huyvu2512.locket-streak&left_text=Visitors&left_color=6e7681&right_color=FFCC00)

[Xem Website](https://streak.huyvu2512.io.vn/) · [Báo Lỗi](https://github.com/huyvu2512/locket-streak/issues) · [Yêu Cầu Tính Năng](https://github.com/huyvu2512/locket-streak/issues) · [Chính Sách Bảo Mật](./SECURITY.md)

</div>

---

<div align="center">
  <img src="public/assets/preview.png" alt="Giao diện Locket Streak" width="100%">
</div>

---

## Giới thiệu

**Locket Streak** là giải pháp tự động hóa toàn diện giúp duy trì và khôi phục chuỗi bạn bè trên nền tảng Locket mỗi ngày. Sản phẩm được thiết kế và phát triển bởi Huy Vũ ([@huyvu2512](https://github.com/huyvu2512)) với mục tiêu nghiên cứu chuyên sâu về giao thức xác thực ứng dụng di động, kiến trúc tự động hóa Serverless đám mây và chuẩn thông báo đẩy Web Push hiện đại.

Hệ thống hoạt động trực tiếp qua giao thức Locket API và cơ sở dữ liệu Firebase Cloud Firestore. Toàn bộ phiên làm việc được mã hóa và bảo vệ nghiêm ngặt; chuỗi bạn bè được duy trì tự nhiên và tự động dọn dẹp khoảnh khắc (moment) ngay sau khi máy chủ Locket ghi nhận thành công nhằm giữ bảng tin cá nhân và bạn bè luôn sạch sẽ.

---

## Tính năng chính

- **Duy trì chuỗi tự động mỗi ngày** - Tự động kiểm tra trạng thái chuỗi và gửi tín hiệu duy trì cho ngày hiện tại theo thời gian thực (múi giờ Việt Nam UTC+7).
- **Khôi phục chuỗi bị gián đoạn** - Tự động nhận diện những ngày bị đứt chuỗi gần nhất và thực hiện quy trình khôi phục theo đúng cơ chế của Locket.
- **Tự động dọn dẹp khoảnh khắc** - Xóa bài đăng tạm thời ngay sau khi Locket xác nhận cộng chuỗi thành công, không để lại hình ảnh rác trên bảng tin của bạn bè.
- **Thông báo đẩy Web Push đa thiết bị** - Hỗ trợ Web Push Notifications chuẩn VAPID qua Service Worker độc lập. Nhận thông báo kết quả chạy chuỗi ngay cả khi đã đóng trình duyệt trên máy tính, Android và iOS (PWA Home Screen).
- **Thông báo đa nền tảng (Telegram & Discord)** - Gửi kết quả chạy chuỗi và khôi phục chi tiết theo thời gian thực qua Telegram Bot và Discord Webhook cá nhân.
- **Quản lý đa tài khoản độc lập** - Dễ dàng liên kết, chuyển đổi và quản lý nhiều tài khoản Locket cùng lúc với cơ chế phân tách dữ liệu an toàn.
- **Bảng thống kê & Nhật ký hoạt động** - Bảng điều khiển công khai (`/stats`) hiển thị trực quan các chỉ số toàn hệ thống (tổng thành viên, chuỗi bảo vệ, kỷ lục cao nhất, tỷ lệ hoàn thành hôm nay) cùng 2 phân hệ nhật ký console: **Nhật ký duy trì chuỗi** và **Nhật ký người dùng mới tham gia**, cam kết bảo vệ quyền riêng tư tuyệt đối (chỉ hiển thị username, không để lộ Email hay UID).
- **Hỗ trợ Apple Shortcuts** - Tích hợp phím tắt iOS Shortcuts tiện lợi, cho phép giữ chuỗi 1 chạm hoặc lập lịch tự động qua ứng dụng Shortcuts trên iPhone.
- **Tương thích ứng dụng PWA** - Hỗ trợ cài đặt ứng dụng trực tiếp ra màn hình chính (Add to Home Screen) trên máy tính, Android và iOS với giao diện Dark Mode cao cấp.
- **Tích hợp GitHub Actions & Cron Worker** - Kiến trúc tách biệt API điều phối hàng đợi (`/api/cron`) và API thực thi (`/api/run`), tối ưu hóa cho GitHub Actions và các dịch vụ cronjob bên ngoài mà không lo gián đoạn vì giới hạn thời gian (timeout).

---

## Bảng công nghệ & Thành phần

| Thành phần | Công nghệ / Giao thức |
| :--- | :--- |
| **Frontend** | HTML5, Vanilla CSS3 (Dark Theme, Glassmorphism, Micro-animations), Vanilla JavaScript (ES6 Modules) |
| **Backend Core** | Node.js (v18+ LTS), Express.js (v4.21+) |
| **Cơ sở dữ liệu** | Google Firebase Cloud Firestore (Admin SDK) |
| **Web Push** | Web Push API (RFC 8292 VAPID, AES-128-GCM, Service Worker) |
| **Kênh thông báo** | Telegram Bot API, Discord Webhook API, Browser Web Push |
| **Hạ tầng triển khai** | Vercel Edge Network / Vercel Serverless Functions |
| **Tự động hóa** | GitHub Actions Workflow (`workflow_dispatch`), cron-job.org |

---

## Cấu trúc thư mục

```text
locket-streak/
├── .github/                      # Cấu hình GitHub Actions
│   └── workflows/
│       └── streak.yml            # Workflow tự động hóa duy trì chuỗi định kỳ
├── api/                          # Backend API & Serverless Endpoints (11 routes)
│   ├── accounts.js               # Quản lý danh sách tài khoản liên kết
│   ├── auto.js                   # Bật / tắt chế độ tự động hóa chuỗi
│   ├── cron.js                   # Điều phối hàng đợi quét tài khoản cần chạy
│   ├── delete.js                 # Xóa tài khoản và dữ liệu khỏi hệ thống
│   ├── logout.js                 # Xử lý đăng xuất phiên làm việc
│   ├── push.js                   # Quản lý VAPID key và đăng ký Web Push
│   ├── run.js                    # Worker thực thi duy trì, khôi phục chuỗi & thông báo
│   ├── stats.js                  # Thống kê chỉ số hệ thống, kỷ lục chuỗi & nhật ký hoạt động
│   ├── streak.js                 # Tra cứu thông số, lịch sử và trạng thái chuỗi thời gian thực
│   ├── verify.js                 # Xác thực tài khoản Locket & làm mới Token
│   └── webhook.js                # Quản lý liên kết thông báo đa kênh (Telegram & Discord)
├── lib/                          # Thư viện & Module nội bộ dùng chung
│   └── db.js                     # Khởi tạo kết nối Firebase Admin SDK Cloud Firestore
├── public/                       # Giao diện người dùng & tài nguyên tĩnh
│   ├── assets/                   # Biểu tượng, logo, preview minh họa
│   ├── pages/                    # Các trang con độc lập
│   │   ├── dashboard.html        # Bảng điều khiển quản trị tài khoản
│   │   ├── docs.html             # Tài liệu đặc tả API & hướng dẫn
│   │   ├── shortcuts.html        # Hướng dẫn Apple Shortcuts cho iOS
│   │   ├── stats.html            # Bảng thống kê hệ thống & nhật ký hoạt động
│   │   └── terms.html            # Điều khoản dịch vụ & quyền riêng tư
│   ├── dashboard.css             # Stylesheet Dark Theme responsive cho Dashboard
│   ├── dashboard.js              # Xử lý tương tác, modal, Web Push phía client
│   ├── index.html                # Trang đăng nhập & giới thiệu chính
│   ├── landing.css               # Stylesheet trang chủ Landing page
│   ├── manifest.json             # Cấu hình Progressive Web App (PWA)
│   ├── sitemap.xml               # Sơ đồ trang web phục vụ SEO
│   └── sw.js                     # Service Worker xử lý sự kiện Push Notification ngầm
├── scripts/                      # Các công cụ hỗ trợ và kịch bản bảo trì
│   └── cleanup-db.js             # Kịch bản kiểm tra toàn vẹn và dọn dẹp Firestore
├── .env.example                  # Mẫu thiết lập biến môi trường
├── LICENSE                       # Giấy phép mã nguồn mở MIT
├── package.json                  # Thông tin gói phụ thuộc và scripts dự án
├── README.md                     # Hướng dẫn chi tiết dự án
├── SECURITY.md                   # Chính sách bảo mật & quy trình báo lỗi
├── server.js                     # Máy chủ Express phục vụ chạy cục bộ
└── vercel.json                   # Cấu hình định tuyến Serverless & Security Headers
```

---

## API Overview

Hệ thống cung cấp danh mục API hoàn chỉnh phục vụ xác thực, quản lý và tự động hóa:

| Endpoint | Method | Xác thực | Mô tả |
| :--- | :--- | :--- | :--- |
| `/api/verify` | `POST` | Public | Xác thực đăng nhập Locket bằng Email và mã OTP Firebase |
| `/api/accounts` | `GET` / `POST` | Client Session | Lấy danh sách tài khoản, thông số chuỗi & trạng thái cấu hình |
| `/api/streak` | `POST` | Client Session | Tra cứu thông số, số ngày chuỗi và cài đặt chi tiết của tài khoản |
| `/api/auto` | `POST` | Client Session (Session Secret) | Bật hoặc tắt trạng thái tự động giữ chuỗi hàng ngày |
| `/api/stats` | `GET` | Public | Thống kê chỉ số hệ thống, kỷ lục chuỗi & nhật ký hoạt động (ẩn danh) |
| `/api/push` | `GET` / `POST` | Client Session | Lấy VAPID public key và đăng ký thiết bị nhận Web Push |
| `/api/telegram` | `GET` / `POST` | Client Session | Thiết lập Chat ID hoặc liên kết Bot Telegram nhận thông báo |
| `/api/discord` | `POST` | Client Session | Cấu hình Discord Webhook URL nhận thông báo kết quả |
| `/api/cron` | `GET` / `POST` | Bearer Token (`CRON_SECRET`) | Quét toàn bộ tài khoản đến giờ chạy và chuyển tiếp sang worker |
| `/api/run` | `POST` | Public (UID / Cooldown) | Thực thi duy trì, khôi phục chuỗi & gửi thông báo đa kênh |
| `/api/logout` | `POST` | Client Session (Session Secret) | Đăng xuất thiết bị (gỡ khỏi máy, bot vẫn chạy auto trên server) |
| `/api/delete` | `POST` | Client Session (Session Secret) | Xóa tài khoản khỏi hệ thống (xóa toàn bộ dữ liệu, hủy bot auto) |

---

## Hướng dẫn cài đặt & Khởi chạy cục bộ

### Yêu cầu hệ thống

- Node.js phiên bản **18.0.0** trở lên (khuyên dùng Node.js 20 LTS).
- Trình quản lý gói `npm` (đi kèm Node.js).
- Một dự án Firebase đã kích hoạt dịch vụ **Cloud Firestore**.

### Các bước thực hiện

1. **Sao chép mã nguồn về máy:**
   ```bash
   git clone https://github.com/huyvu2512/locket-streak.git
   cd locket-streak
   ```

2. **Cài đặt các gói thư viện phụ thuộc:**
   ```bash
   npm install
   ```

3. **Cấu hình biến môi trường:**
   Tạo file `.env` tại thư mục gốc dựa theo tệp mẫu `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Sau đó điền đầy đủ các thông số cấu hình tương ứng.

4. **Khởi chạy máy chủ phát triển:**
   ```bash
   npm run dev
   ```
   Mở trình duyệt tại địa chỉ: `http://localhost:3000`.

---

## Cấu hình biến môi trường (`.env`)

```env
# System Configuration
API_BASE_URL=https://your-domain.com
CRON_SECRET=your_super_secret_cron_token_here

# Locket Configuration
LOCKET_FIREBASE_KEY=your_locket_firebase_api_key
LOCKET_API_URL=https://your_locket_api_url
LOCKET_AUTH_URL=https://your_auth_endpoint
LOCKET_REFRESH_TOKEN_URL=https://your_token_refresh_url
LOCKET_STORAGE_URL=https://your_storage_url
LOCKET_STORAGE_BUCKET=your_storage_bucket
LOCKET_BUNDLE_ID=your_bundle_id
LOCKET_CLIENT_VERSION=1.0.0

# Firebase Firestore (Service Account)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Telegram Bot (Tùy chọn)
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Web Push Notifications (VAPID)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:your_email@example.com
```

> [!TIP]
> Bạn có thể tự sinh cặp khóa VAPID mới bằng lệnh:
> ```bash
> npx web-push generate-vapid-keys
> ```

---

## Tài liệu & Chính sách

| Tài liệu | Nội dung |
| :--- | :--- |
| [SECURITY.md](./SECURITY.md) | Chính sách bảo mật hệ thống, xử lý token và quy trình báo cáo lỗ hổng |
| [LICENSE](./LICENSE) | Giấy phép mã nguồn mở MIT |

---

## Tuyên bố miễn trừ trách nhiệm

Dự án này được xây dựng hoàn toàn với mục đích học tập, nghiên cứu kỹ thuật về cơ chế quản lý phiên trên thiết bị di động và giao thức truyền thông đám mây mang tính chất phi thương mại.

Dự án không có bất kỳ liên kết, tài trợ hay đại diện chính thức nào từ **Locket Media, Inc.**. Tên gọi, logo và các nhãn hiệu "Locket" thuộc toàn quyền sở hữu của Locket Media, Inc.

Mọi hành vi sử dụng mã nguồn này vào mục đích trục lợi cá nhân, xâm phạm tài khoản người khác hoặc gây tổn hại tới hệ thống của bên thứ ba đều bị nghiêm cấm. Người dùng tự chịu mọi trách nhiệm pháp lý đối với bất kỳ hành vi và hậu quả phát sinh nào từ việc sử dụng mã nguồn này. Tác giả hoàn toàn không chịu trách nhiệm trong trường hợp người dùng sử dụng sai mục đích.

---

## Tác giả & Bản quyền

- Dự án được phát triển và duy trì bởi **Huy Vũ** ([@huyvu2512](https://github.com/huyvu2512)).
- Mã nguồn được phân phối công khai theo giấy phép mã nguồn mở **[MIT License](./LICENSE)**.
