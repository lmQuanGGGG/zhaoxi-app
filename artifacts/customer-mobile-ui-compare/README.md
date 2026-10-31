# So sánh giao diện PWA ↔ app iOS (ZhaoXi khách hàng)

Mỗi `compare-*.jpg` đặt ảnh PWA (trái, Chrome 402×874) cạnh ảnh app native (phải, iPhone 17 Simulator, đã cắt thanh trạng thái).
`pwa-*.jpg` / `app-*.jpg` là ảnh gốc đã thu nhỏ. Dữ liệu là dữ liệu production thật (backend https://zhaoxi-app-puce.vercel.app), tài khoản khách (guest).

| Màn | File |
| --- | --- |
| Chọn ngôn ngữ (màn đầu) | compare-00-language.jpg |
| Trang chủ | compare-01-home.jpg |
| Trung tâm dịch vụ | compare-02-services.jpg |
| Danh sách nhà hàng | compare-03-restaurants.jpg |
| Chi tiết nhà hàng (thực đơn) | compare-04-restaurant.jpg |
| Giỏ hàng | compare-05-cart.jpg |
| Xác nhận đơn (checkout) | compare-06-checkout.jpg |
| Đơn của tôi | compare-07-orders.jpg |
| Cá nhân | compare-08-profile.jpg |
| Trung tâm thông báo | compare-09-notifications.jpg |
| Trung tâm tin nhắn | compare-10-messages.jpg |
| Chi tiết dịch vụ | compare-11-service-detail.jpg |
| Khám phá / tìm kiếm | compare-12-search.jpg |
| Danh sách dịch vụ theo module | compare-13-module.jpg |
| Hỗ trợ khẩn cấp | compare-15-emergency.jpg |
| Đăng nhập (chỉ ảnh app) | app-14-login.jpg |

## Đợt 3: hoàn thiện chức năng còn thiếu (chỉ ảnh app)

| Màn | File |
| --- | --- |
| Thuê nhà: bộ lọc + lối vào "Yêu cầu thuê nhà của tôi" | app-20-housing-list.jpg |
| Chi tiết nhà/phòng (trạng thái, thông số, form gửi yêu cầu thuê) | app-21-housing-detail.jpg |
| Đặt tour: gói, người lớn/trẻ em, ngày + khung giờ còn chỗ (lịch thật từ `/api/travel-availability`) | app-22-travel-booking.jpg |
| Đơn của tôi: ô "Yêu cầu thuê nhà" / "Booking du lịch" | app-23-orders-inquiry-tiles.jpg |
| Theo dõi yêu cầu thuê nhà (lịch xem nhà, chat Partner, lịch sử) | app-24-housing-requests.jpg |
| Đã xem gần đây (sửa lỗi trắng trang do trùng key) | app-25-history.jpg |
| Trung tâm thanh toán (theo PWA `/payment`) | app-26-payment-center.jpg |
| Trung tâm trợ giúp (theo PWA `/help`) | app-27-help.jpg |
| Gửi phản hồi Beta (theo PWA `/feedback`) | app-28-feedback.jpg |
| Bản đồ theo dõi tài xế trong chi tiết đơn (dữ liệu giả để chụp, route thử đã xoá) | app-29-live-delivery-map.jpg |
| Bộ icon dịch vụ vẽ lại (minh hoạ 3D SVG trên thẻ trắng) — trang chủ | app-30-home-service-icons.jpg |
| Bộ icon dịch vụ vẽ lại — Trung tâm dịch vụ | app-31-services-hub-icons.jpg |
| Thanh điều hướng Liquid Glass iOS 26 (kính khúc xạ, viên kính trượt theo tab) | app-32-liquid-glass-dock.jpg |
| Thẻ không viền, bóng mờ mềm (trang chủ, Trung tâm dịch vụ, Cá nhân) | app-33-borderless-cards.jpg |
| Home kiểu My Viettel: nền ngọc bích + vàng, header kính, hero ảnh danh thắng với chip kính, vòm dịch vụ cong | app-34-home-glass-hero.jpg |
| Home nền ngọc trai aurora pastel, hero chồng thẻ ảnh xếp lớp, kính tròn + quầng sáng icon dịch vụ | app-35-home-pearl-aurora.jpg |
| Home nền san hô hoàng hôn (SVG), thẻ ảnh + tấm kính lòi bên trái theo ảnh mẫu | app-36-home-coral.jpg |
| Hero vuốt ngang: thẻ trước nghiêng 3D bay đi, thẻ sau (ảnh thật, hình thang) tiến lên | app-37-hero-3d-swipe.jpg |
| "Khám phá không giới hạn": khối tối, tab kính, băng chuyền thẻ 3D (coverflow), hình 3D lơ lửng | app-38-explore-more-3d.jpg |
| Nút dùng chung chuyển sang Liquid Glass (topbar, quay lại, chip, +/−, Thêm vào giỏ, Đặt dịch vụ, Yêu thích) | app-39-glass-buttons.jpg |
| Quả cầu kính trọn vẹn quanh dịch vụ giữa, quầng sáng không bị cắt | app-40-service-glass-sphere.jpg |
| Dịch vụ không có ảnh: minh hoạ 3D phóng to theo khung, nền chuyển màu theo dịch vụ | app-41-no-photo-3d-art.jpg |
