export const dynamic = "force-dynamic";

const links = [
  { label: "Customer", href: process.env.ZHAOXI_CUSTOMER_URL || "https://zhaoxi-customer.vercel.app" },
  { label: "Partner", href: process.env.ZHAOXI_PARTNER_URL || "https://zhaoxi-partner.vercel.app" },
  { label: "Admin", href: process.env.ZHAOXI_ADMIN_URL || "https://zhaoxi-admin.vercel.app" },
];

export default function BackendHome() {
  return (
    <main className="backend-shell">
      <section className="backend-card">
        <div className="backend-logo">喜</div>
        <small>赵喜 · ZHAOXI</small>
        <h1>Platform Backend</h1>
        <p>This address is the API backend, not the Admin dashboard.</p>
        <div className="backend-health"><span /> API service deployed</div>
        <div className="backend-links">
          {links.map((item) => <a key={item.label} href={item.href}>{item.label}</a>)}
        </div>
        <a className="backend-api" href="/api/health">Open API health</a>
      </section>
    </main>
  );
}
