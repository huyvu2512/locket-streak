# Chính Sách Bảo Mật (Security Policy)

## Phạm vi và Mục đích

Dự án **Locket Streak** được phát triển hoàn toàn với mục đích học tập, nghiên cứu về cơ chế quản lý phiên trên ứng dụng di động, giao thức xác thực Firebase / Google Identity Toolkit, chuẩn thông báo đẩy Web Push (VAPID / Service Worker) và kiến trúc tự động hóa Serverless phi thương mại.

Mọi hành vi sử dụng công cụ này vào mục đích trục lợi cá nhân, xâm phạm tài khoản của người khác khi chưa được cho phép hoặc vi phạm [Điều khoản Dịch vụ của Locket](https://locket.camera) đều bị nghiêm cấm.

---

## Xử lý Dữ liệu Người dùng & Bảo mật Hệ thống

1. **Bảo mật Thông tin Xác thực (Tokens):**
   - Thông tin phiên đăng nhập (`idToken`, `refreshToken`) được lưu trữ bảo mật trong cơ sở dữ liệu **Firebase Cloud Firestore**. Toàn bộ quyền truy xuất ở phía máy chủ được bảo vệ nghiêm ngặt thông qua Firebase Admin SDK sử dụng private key mã hóa.
   - Khi token hết hạn, hệ thống chỉ giao tiếp trực tiếp với dịch vụ chính thức của Google (`securetoken.googleapis.com`) để làm mới token trong bộ nhớ tạm thời và cập nhật lại vào tài liệu người dùng.
   - Hệ thống tuyệt đối không bao giờ trả về mật khẩu gốc, token nhạy cảm hay private key qua các phản hồi API công khai.

2. **Phân tách Dữ liệu Người dùng Tuyệt đối:**
   - Dữ liệu tài khoản, cấu hình thông báo và danh sách đăng ký thiết bị được phân vùng độc lập theo định danh người dùng (`users/{uid}`).
   - Các thao tác cập nhật hoặc đọc dữ liệu chỉ áp dụng trên đúng phạm vi tài khoản của người dùng tương ứng, ngăn chặn hoàn toàn rủi ro rò rỉ hoặc truy cập chéo giữa các tài khoản khác nhau.

3. **Bảo mật Thông báo Đẩy Web Push:**
   - Hệ thống triển khai chuẩn mã hóa **VAPID (Voluntary Application Server Identification)** theo đặc tả RFC 8292.
   - Mọi gói tin thông báo đẩy đều được mã hóa chuẩn **AES-128-GCM** trước khi truyền qua máy chủ đẩy của các nhà cung cấp nền tảng (Apple APNs cho iOS / Safari, Google FCM cho Android / Chrome).
   - Thông tin đăng ký thiết bị (`PushSubscription`) được lưu trữ phân vùng theo tài khoản (`users/{uid}/subscriptions/{endpointHash}`) và tự động thu hồi/dọn dẹp khi trình duyệt phản hồi mã trạng thái hết hạn (`404 Not Found` hoặc `410 Gone`).

4. **Xác thực API Tự động hóa & Khóa bí mật (Cron Secret):**
   - Endpoint kích hoạt tiến trình tự động hóa hàng loạt `/api/cron` được bảo vệ bằng cơ chế xác thực chuỗi khóa bí mật `CRON_SECRET` thông qua header `Authorization: Bearer <CRON_SECRET>` hoặc header `x-cron-secret`. Bất kỳ yêu cầu nào không có khóa xác thực hoặc khóa không khớp đều bị từ chối ngay lập tức.
   - Endpoint thực thi chuỗi `/api/run` được bảo vệ chặt chẽ bởi cơ chế kiểm soát tần suất (Rate Limiting / Cooldown 30 giây), kiểm tra định dạng UID nghiêm ngặt và cơ chế phiên an toàn nhằm ngăn chặn hành vi quấy phá hoặc tấn công từ chối dịch vụ.

5. **Kết nối Mã hóa Toàn trình (HTTPS / TLS):**
   - Toàn bộ lưu lượng truy cập giữa trình duyệt người dùng, mạng phân phối biên Vercel Edge Network, Firebase Firestore và các endpoint máy chủ Locket đều được mã hóa bằng giao thức HTTPS / TLS 1.3 tiêu chuẩn.

6. **Tiêu đề Bảo mật (Security Headers):**
   - Hệ thống được cấu hình sẵn các tiêu đề bảo vệ nâng cao nhằm chống lại các cuộc tấn công phổ biến trên web:
     - `X-Content-Type-Options: nosniff` (chống tấn công MIME-sniffing)
     - `X-Frame-Options: SAMEORIGIN` (chống tấn công Clickjacking)
     - `X-XSS-Protection: 1; mode=block` (ngăn chặn tấn công Cross-Site Scripting)
     - `Referrer-Policy: strict-origin-when-cross-origin` (bảo vệ thông tin nguồn chuyển hướng)

7. **Bảo vệ Quyền riêng tư Bảng tin (Privacy Protection):**
   - Để kích hoạt việc duy trì chuỗi mà không gây ảnh hưởng tới trải nghiệm của bạn bè, hệ thống tự động xóa ngay lập tức khoảnh khắc (moment) tạm thời vừa đăng qua API Locket sau khi máy chủ xác nhận cộng chuỗi thành công, không để lại hình ảnh rác trên bảng tin.

---

## Báo cáo Lỗ hổng Bảo mật

Nếu bạn phát hiện bất kỳ vấn đề bảo mật, điểm yếu tiềm ẩn hoặc lỗ hổng nào liên quan đến mã nguồn của dự án này, chúng tôi rất trân trọng sự đóng góp của bạn. Vui lòng thực hiện theo quy trình phối hợp sau:

1. **Tuyệt đối không công khai lỗ hổng** qua Issue công khai, Pull Request hoặc các kênh thảo luận cộng đồng trên GitHub.
2. Gửi thông tin chi tiết về lỗ hổng kèm theo kịch bản tái hiện (PoC) tới các kênh liên hệ trực tiếp của tác giả:
   - **Trang thông tin cá nhân:** [https://huyvu2512.io.vn](https://huyvu2512.io.vn)
   - **Hồ sơ GitHub:** [@huyvu2512](https://github.com/huyvu2512)
3. Tác giả sẽ tiếp nhận thông tin, tiến hành đánh giá mức độ nghiêm trọng và cập nhật bản vá bảo mật trong thời gian sớm nhất có thể.
