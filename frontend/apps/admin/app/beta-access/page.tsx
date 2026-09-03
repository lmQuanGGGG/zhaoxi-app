"use client";
import { useEffect, useState } from "react";
type Invite = {
  id: string;
  codeHint: string;
  label: string | null;
  role: string;
  maxUses: number;
  usedCount: number;
  status: string;
  expiresAt: string | null;
};
type Access = {
  id: string;
  userId: string;
  role: string;
  status: string;
  source: string;
  nickname: string | null;
  wechatOpenId: string | null;
};
export default function BetaAccessAdmin() {
  const [data, setData] = useState<{ invites: Invite[]; access: Access[] }>({
    invites: [],
    access: [],
  });
  const [role, setRole] = useState("customer");
  const [label, setLabel] = useState("");
  const [lastCode, setLastCode] = useState("");
  async function load() {
    const r = await fetch("/api/platform-beta-access/admin", {
      cache: "no-store",
    });
    const p = await r.json();
    if (r.ok) setData(p.data);
  }
  useEffect(() => {
    void load();
  }, []);
  async function create() {
    const r = await fetch("/api/platform-beta-access/admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role, label, maxUses: 10 }),
    });
    const p = await r.json();
    if (r.ok) {
      setLastCode(p.data.code);
      setLabel("");
      await load();
    }
  }
  async function status(id: string, s: string) {
    await fetch(`/api/platform-beta-access/admin/invites/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    await load();
  }
  return (
    <main
      style={{
        width: "min(100%,520px)",
        margin: "0 auto",
        minHeight: "100dvh",
        padding: 18,
        background: "#f6faf7",
        fontFamily: "Inter,Arial,sans-serif",
      }}
    >
      <small style={{ color: "#07a856", fontWeight: 800 }}>
        ZHAOXI · BETA 15.3
      </small>
      <h1>Beta Access</h1>
      <p style={{ color: "#64748b" }}>
        Invite codes, WeChat tester access and role control.
      </p>
      <section
        style={{
          background: "white",
          padding: 14,
          borderRadius: 16,
          display: "grid",
          gap: 10,
        }}
      >
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Invite label"
          style={{ padding: 11, borderRadius: 10, border: "1px solid #ddd" }}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ padding: 11, borderRadius: 10 }}
        >
          {["customer", "partner"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <button
          onClick={create}
          style={{
            padding: 12,
            border: 0,
            borderRadius: 12,
            background: "#07c160",
            color: "white",
            fontWeight: 800,
          }}
        >
          Create invite
        </button>
        {lastCode && (
          <div style={{ padding: 12, borderRadius: 12, background: "#ecfdf5" }}>
            New code: <b>{lastCode}</b>
            <br />
            <small>Shown once. Copy it now.</small>
          </div>
        )}
      </section>
      <h2>Invite codes</h2>
      <section style={{ display: "grid", gap: 10 }}>
        {data.invites.map((x) => (
          <article
            key={x.id}
            style={{ background: "white", padding: 14, borderRadius: 16 }}
          >
            <b>{x.label || x.codeHint}</b>
            <p>
              {x.role} · {x.usedCount}/{x.maxUses} · {x.status}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => status(x.id, "active")}>Active</button>
              <button onClick={() => status(x.id, "suspended")}>Suspend</button>
              <button onClick={() => status(x.id, "revoked")}>Revoke</button>
            </div>
          </article>
        ))}
      </section>
      <h2>Testers</h2>
      <section style={{ display: "grid", gap: 8 }}>
        {data.access.map((x) => (
          <article
            key={x.id}
            style={{ background: "white", padding: 12, borderRadius: 14 }}
          >
            <b>{x.nickname || x.wechatOpenId || x.userId}</b>
            <div>
              {x.role} · {x.status} · {x.source}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
