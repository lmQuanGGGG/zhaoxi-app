import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư | ZhaoXi Partner",
  description: "Chính sách quyền riêng tư của ứng dụng ZhaoXi Partner.",
};

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: "100dvh", padding: "32px 18px", background: "#f4f7f5", color: "#17231e" }}>
      <article style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(24px, 6vw, 52px)", borderRadius: 28, background: "#fff", boxShadow: "0 18px 55px rgba(22,55,42,.10)", lineHeight: 1.65 }}>
        <p style={{ margin: 0, color: "#087c5b", fontWeight: 800, letterSpacing: ".08em", fontSize: 12 }}>ZHAOXI PARTNER</p>
        <h1 style={{ margin: "8px 0 8px", fontSize: "clamp(30px, 6vw, 44px)", lineHeight: 1.12 }}>Chính sách quyền riêng tư</h1>
        <p style={{ margin: 0, color: "#60726a" }}>Cập nhật lần cuối: 25 tháng 9, 2026</p>

        <Section title="1. Phạm vi">
          Chính sách này áp dụng cho ứng dụng ZhaoXi Partner do TRIEU HY MEDIA COMPANY LIMITED vận hành. Ứng dụng dành cho đối tác/cửa hàng xử lý đơn hàng, xác nhận trạng thái và nhận thông báo đơn mới.
        </Section>
        <Section title="2. Dữ liệu được xử lý">
          Để vận hành chức năng đối tác, ZhaoXi Partner xử lý các dữ liệu tối thiểu sau: tên và số điện thoại người dùng/đối tác; thông tin đơn hàng (món, số lượng, giá trị, trạng thái); địa chỉ giao/nhận do đơn hàng cung cấp; và mã thông báo của thiết bị để gửi thông báo đẩy về đơn hàng.
        </Section>
        <Section title="3. Mục đích sử dụng">
          Dữ liệu chỉ được dùng để đăng nhập tài khoản đối tác, hiển thị và quản lý đơn hàng, liên hệ khi cần cho việc giao nhận, đồng bộ trạng thái đơn và gửi thông báo liên quan đến đơn hàng. Ứng dụng không bán dữ liệu cá nhân và không sử dụng dữ liệu này cho quảng cáo theo dõi giữa các ứng dụng hoặc website.
        </Section>
        <Section title="4. Chia sẻ dữ liệu">
          Thông tin đơn hàng được hiển thị cho các bên cần thiết để hoàn thành đơn, gồm đối tác/cửa hàng và đơn vị giao nhận được chọn cho đơn hàng. Dữ liệu cũng có thể được xử lý bởi nhà cung cấp hạ tầng cần thiết để vận hành hệ thống và gửi thông báo đẩy.
        </Section>
        <Section title="5. Bảo mật và quyền của bạn">
          Chúng tôi áp dụng các biện pháp kỹ thuật hợp lý để bảo vệ dữ liệu. Bạn có thể yêu cầu xem, chỉnh sửa hoặc hỗ trợ xóa dữ liệu cá nhân theo quy định áp dụng bằng cách liên hệ với chúng tôi.
        </Section>
        <Section title="6. Liên hệ">
          Nếu có câu hỏi về quyền riêng tư hoặc hỗ trợ ZhaoXi Partner, vui lòng liên hệ <a href="mailto:itsupport@trieuhymedia.net" style={{ color: "#087c5b", fontWeight: 800 }}>itsupport@trieuhymedia.net</a>.
        </Section>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section style={{ marginTop: 30 }}><h2 style={{ margin: "0 0 8px", fontSize: 20 }}>{title}</h2><p style={{ margin: 0, color: "#42554b" }}>{children}</p></section>;
}
