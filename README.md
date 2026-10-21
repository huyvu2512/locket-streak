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
├── api/                          # Backend API & Serverless Endpoints
│   ├── accounts.js               # Quản lý danh sách tài khoản liên kết
│   ├── auto.js                   # Bật / tắt chế độ tự động hóa chuỗi
│   ├── cron.js                   # Điều phối hàng đợi quét tài khoản cần chạy
│   ├── db.js                     # Khởi tạo kết nối Firebase Admin SDK
│   ├── discord.js                # Quản lý cấu hình Discord Webhook
│   ├── logout.js                 # Xử lý đăng xuất phiên làm việc
│   ├── push.js                   # Quản lý VAPID key và đăng ký Web Push
│   ├── run.js                    # Worker thực thi duy trì, khôi phục chuỗi & thông báo
│   ├── streak.js                 # Kích hoạt chạy chuỗi thủ công tức thì
│   ├── telegram.js               # Quản lý cấu hình Telegram Bot & Webhook
│   └── verify.js                 # Xác thực tài khoản Locket & làm mới Token
├── public/                       # Giao diện người dùng & tài nguyên tĩnh
│   ├── assets/                   # Biểu tượng, logo, preview minh họa
│   ├── dashboard.css             # Stylesheet Dark Theme responsive cho Dashboard
│   ├── dashboard.js              # Xử lý tương tác, modal, Web Push phía client
│   ├── index.html                # Trang đăng nhập & giới thiệu chính
│   ├── dashboard.html            # Bảng điều khiển quản trị tài khoản
│   ├── manifest.json             # Cấu hình Progressive Web App (PWA)
│   └── sw.js                     # Service Worker xử lý sự kiện Push Notification ngầm
├── scripts/                      # Các công cụ hỗ trợ và kịch bản bảo trì
│   └── migrate-cleanup.js        # Kịch bản dọn dẹp dữ liệu Firestore
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
| `/api/verify` | `POST` | Public | Xác thực thông tin đăng nhập Locket bằng email và mật khẩu |
| `/api/accounts` | `GET` / `POST` / `DELETE` | Client Session | Lấy danh sách tài khoản, chuyển đổi hoặc xóa tài khoản |
| `/api/streak` | `POST` | Client Session | Kích hoạt duy trì chuỗi thủ công ngay lập tức cho 1 tài khoản |
| `/api/auto` | `POST` | Client Session | Bật hoặc tắt trạng thái tự động giữ chuỗi hàng ngày |
| `/api/push` | `GET` / `POST` / `DELETE` | Client Session | Lấy VAPID public key, đăng ký thiết bị nhận Web Push hoặc gửi test |
| `/api/telegram` | `POST` | Client Session | Thiết lập Chat ID hoặc liên kết Bot Telegram nhận thông báo |
| `/api/discord` | `POST` | Client Session | Cấu hình Discord Webhook URL nhận thông báo kết quả |
| `/api/cron` | `GET` | Bearer Token | Quét danh sách tài khoản đến giờ chạy và chuyển tiếp sang worker |
| `/api/run` | `POST` | Bearer Token | Worker Serverless thực hiện chuỗi, khôi phục ngày đứt và gửi thông báo |
| `/api/logout` | `POST` | Client Session | Đăng xuất phiên làm việc hiện tại |

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
API_BASE_URL=https://streak.huyvu2512.io.vn
CRON_SECRET=your_super_secret_cron_token_here

# Locket Configuration
LOCKET_FIREBASE_KEY=your_locket_firebase_api_key
LOCKET_API_URL=https://api.locketcamera.com
LOCKET_AUTH_URL=https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword
LOCKET_REFRESH_TOKEN_URL=https://securetoken.googleapis.com/v1/token
LOCKET_STORAGE_URL=https://firebasestorage.googleapis.com/v0/b
LOCKET_STORAGE_BUCKET=locket-img.appspot.com
LOCKET_BUNDLE_ID=com.locket.Locket
LOCKET_CLIENT_VERSION=1.68.0

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
VAPID_SUBJECT=mailto:admin@streak.huyvu2512.io.vn
```

> [!TIP]
> Bạn có thể tự sinh cặp khóa VAPID mới bằng lệnh:
> ```bash
> npx web-push generate-vapid-keys
> ```

---

## Triển khai lên Vercel

1. Đẩy mã nguồn dự án lên kho lưu trữ GitHub cá nhân.
2. Đăng nhập vào trang quản trị [Vercel Dashboard](https://vercel.com/) và chọn **Add New Project**.
3. Chọn repository `locket-streak`.
4. Trong phần **Environment Variables**, sao chép toàn bộ các biến trong file `.env` của bạn vào cấu hình Vercel.
5. Nhấn **Deploy**. Vercel sẽ tự động tối ưu hóa định tuyến API và phân phối ứng dụng qua mạng toàn cầu.

---

## Tự động hóa với GitHub Actions & cron-job.org

Hệ thống được thiết kế tối ưu để chạy tự động qua **GitHub Actions** kết hợp **cron-job.org** nhằm đảm bảo không bao giờ bị gián đoạn hay vượt quá thời gian thực thi (timeout) của các hàm Serverless:

### 1. Cấu hình GitHub Repository Secrets
Truy cập kho lưu trữ GitHub: **Settings** > **Secrets and variables** > **Actions** và thêm các biến bí mật sau:
- `API_BASE_URL`: Địa chỉ tên miền triển khai của bạn (ví dụ: `https://streak.huyvu2512.io.vn`).
- `CRON_SECRET`: Chuỗi khóa bí mật xác thực API (trùng khớp với biến `CRON_SECRET` đã cài trên Vercel).

### 2. Thiết lập Lập lịch trên cron-job.org
Tạo một tác vụ định kỳ trên [console.cron-job.org](https://console.cron-job.org):
- **Title**: `Wakeup Locket Streak Workflow`
- **URL**: `https://api.github.com/repos/huyvu2512/locket-streak/actions/workflows/streak.yml/dispatches`
- **Request Method**: `POST`
- **Request Headers**:
  - `Accept`: `application/vnd.github+json`
  - `Authorization`: `Bearer <YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>`
  - `X-GitHub-Api-Version`: `2022-11-28`
  - `Content-Type`: `application/json`
  - `User-Agent`: `cronjob-agent`
- **Request Body**:
  ```json
  {"ref": "main"}
  ```
- **Schedule**: Thiết lập tần suất chạy phù hợp (ví dụ: chạy mỗi 30 phút hoặc vào các khung giờ cố định trong ngày).

---

## Tài liệu & Chính sách

| Tài liệu | Nội dung |
| :--- | :--- |
| [SECURITY.md](./SECURITY.md) | Chính sách bảo mật hệ thống, xử lý token và quy trình báo cáo lỗ hổng |
| [LICENSE](./LICENSE) | Giấy phép mã nguồn mở MIT |
| [Apple Shortcuts](https://streak.huyvu2512.io.vn/) | Phím tắt hỗ trợ kích hoạt chuỗi nhanh 1 chạm trên iPhone |

---

## Tuyên bố miễn trừ trách nhiệm

Dự án này được xây dựng hoàn toàn với mục đích học tập, nghiên cứu kỹ thuật về cơ chế quản lý phiên trên thiết bị di động và giao thức truyền thông đám mây mang tính chất phi thương mại.

Dự án không có bất kỳ liên kết, tài trợ hay đại diện chính thức nào từ **Locket Media, Inc.**. Tên gọi, logo và các nhãn hiệu "Locket" thuộc toàn quyền sở hữu của Locket Media, Inc.

Mọi hành vi sử dụng mã nguồn này vào mục đích trục lợi cá nhân, xâm phạm tài khoản người khác hoặc gây tổn hại tới hệ thống của bên thứ ba đều bị nghiêm cấm. Người dùng tự chịu mọi trách nhiệm pháp lý đối với bất kỳ hành vi và hậu quả phát sinh nào từ việc sử dụng mã nguồn này. Tác giả hoàn toàn không chịu trách nhiệm trong trường hợp người dùng sử dụng sai mục đích.

---

## Tác giả & Bản quyền

- Dự án được phát triển và duy trì bởi **Huy Vũ** ([@huyvu2512](https://github.com/huyvu2512)).
- Mã nguồn được phân phối công khai theo giấy phép mã nguồn mở **[MIT License](./LICENSE)**.
