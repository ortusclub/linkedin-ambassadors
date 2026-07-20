"use client";

import { useEffect, useState, useCallback } from "react";

interface EmailRow {
  id: string;
  to: string;
  subject: string;
  bcc: string | null;
  status: string;
  error: string | null;
  body: string | null;
  createdAt: string;
}

const F_SANS = "var(--font-sans),system-ui,sans-serif";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const when = (iso: string) => {
  const d = new Date(iso);
  return `${MON[d.getMonth()]} ${d.getDate()}, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

const statusStyle = (s: string): React.CSSProperties => {
  const [bg, fg] =
    s === "sent" ? ["var(--st-active-bg)", "var(--st-active-fg)"]
    : s === "failed" ? ["var(--danger-bg,#fde8e8)", "var(--danger,#c0392b)"]
    : ["var(--tag-bg)", "var(--tag-fg)"];
  return { font: `600 10.5px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, background: bg, color: fg, whiteSpace: "nowrap" };
};

export default function EmailsPage() {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<EmailRow | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/emails${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      const data = await res.json();
      setRows(data.emails || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(""); }, [load]);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto", fontFamily: F_SANS }}>
      <h1 style={{ font: `700 22px ${F_SANS}`, margin: "0 0 4px", color: "var(--fg,#0F1419)" }}>Email log</h1>
      <p style={{ font: `400 13px ${F_SANS}`, color: "var(--muted,#536471)", margin: "0 0 18px" }}>
        Every email the app has sent — reminders, charges, renewals, verification. Click a row to read the full email. Newest first, latest 300.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); load(q.trim()); }}
        style={{ display: "flex", gap: 8, marginBottom: 16 }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search recipient or subject…"
          style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border,#e2e5e8)", font: `400 13px ${F_SANS}` }}
        />
        <button type="submit" style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#0A66C2", color: "#fff", font: `600 13px ${F_SANS}`, cursor: "pointer" }}>
          Search
        </button>
      </form>

      {loading ? (
        <p style={{ color: "var(--muted,#536471)", font: `400 13px ${F_SANS}` }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "var(--muted,#536471)", font: `400 13px ${F_SANS}` }}>No emails found.</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--border,#e2e5e8)", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--tag-bg,#f5f6f7)" }}>
                {["When", "To", "Subject", "Status"].map((h) => (
                  <th key={h} style={{ padding: "9px 12px", font: `600 11px ${F_SANS}`, color: "var(--muted,#536471)", textTransform: "uppercase", letterSpacing: ".03em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setOpen(r)}
                  style={{ borderTop: "1px solid var(--border,#eef0f2)", cursor: "pointer" }}
                  title="Click to read the full email"
                >
                  <td style={{ padding: "9px 12px", font: `400 12.5px ${F_SANS}`, color: "var(--muted,#536471)", whiteSpace: "nowrap" }}>{when(r.createdAt)}</td>
                  <td style={{ padding: "9px 12px", font: `500 12.5px ${F_SANS}`, color: "var(--fg,#0F1419)", whiteSpace: "nowrap" }}>{r.to}</td>
                  <td style={{ padding: "9px 12px", font: `400 12.5px ${F_SANS}`, color: "var(--fg,#0F1419)" }}>{r.subject}</td>
                  <td style={{ padding: "9px 12px" }}><span style={statusStyle(r.status)}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div
          onClick={() => setOpen(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto", zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, maxWidth: 640, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,.25)" }}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #eef0f2" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ font: `700 15px ${F_SANS}`, color: "#0F1419", marginBottom: 4 }}>{open.subject}</div>
                  <div style={{ font: `400 12px ${F_SANS}`, color: "#536471" }}>
                    To {open.to}{open.bcc ? ` · bcc ${open.bcc}` : ""} · {when(open.createdAt)} · <span style={statusStyle(open.status)}>{open.status}</span>
                  </div>
                </div>
                <button onClick={() => setOpen(null)} style={{ border: "none", background: "transparent", font: `400 22px ${F_SANS}`, color: "#536471", cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
              {open.error && <div style={{ font: `400 12px ${F_SANS}`, color: "#c0392b", marginTop: 8 }}>Error: {open.error}</div>}
            </div>
            <div style={{ padding: "8px 8px 20px" }}>
              {open.body
                ? <div style={{ border: "1px solid #eef0f2", borderRadius: 8, overflow: "hidden" }} dangerouslySetInnerHTML={{ __html: open.body }} />
                : <p style={{ font: `400 13px ${F_SANS}`, color: "#536471", padding: "12px 14px" }}>No stored content for this email (it predates content capture).</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
