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

interface ForecastEvent {
  date: string;
  rentalId: string;
  account: string;
  to: string;
  stage: string;
  label: string;
  subject: string;
  html: string;
  condition: string | null;
}

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const when = (iso: string) => {
  const d = new Date(iso);
  return `${MON[d.getMonth()]} ${d.getDate()}, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};
const day = (iso: string) => { const d = new Date(iso); return `${MON[d.getMonth()]} ${d.getDate()}`; };

const statusStyle = (s: string): React.CSSProperties => {
  const [bg, fg] =
    s === "sent" ? ["var(--st-active-bg)", "var(--st-active-fg)"]
    : s === "failed" ? ["var(--danger-bg,#fde8e8)", "var(--danger,#c0392b)"]
    : ["var(--tag-bg)", "var(--tag-fg)"];
  return { font: `600 10.5px ${F_SANS}`, padding: "2px 8px", borderRadius: 999, background: bg, color: fg, whiteSpace: "nowrap" };
};

type ModalContent = { subject: string; to: string; bcc?: string | null; when: string; status?: string; error?: string | null; body: string | null; condition?: string | null };

export default function EmailsPage() {
  const [tab, setTab] = useState<"upcoming" | "sent">("upcoming");
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [events, setEvents] = useState<ForecastEvent[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<ModalContent | null>(null);

  const loadSent = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/emails${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      const data = await res.json();
      setRows(data.emails || []);
    } finally { setLoading(false); }
  }, []);

  const loadUpcoming = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/emails/upcoming`);
      const data = await res.json();
      setEvents(data.events || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (tab === "sent") loadSent(""); else loadUpcoming(); }, [tab, loadSent, loadUpcoming]);

  const tabBtn = (key: "upcoming" | "sent", label: string): React.CSSProperties => ({
    padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
    font: `600 13px ${F_SANS}`,
    background: tab === key ? "#0A66C2" : "var(--tag-bg,#f0f1f3)",
    color: tab === key ? "#fff" : "var(--muted,#536471)",
  });

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto", fontFamily: F_SANS }}>
      <h1 style={{ font: `700 22px ${F_SANS}`, margin: "0 0 4px", color: "var(--fg,#0F1419)" }}>Emails</h1>
      <p style={{ font: `400 13px ${F_SANS}`, color: "var(--muted,#536471)", margin: "0 0 16px" }}>
        What&apos;s scheduled to go out and what&apos;s already been sent. Click any row to read the full email.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <button style={tabBtn("upcoming", "Upcoming")} onClick={() => setTab("upcoming")}>Upcoming (scheduled)</button>
        <button style={tabBtn("sent", "Sent")} onClick={() => setTab("sent")}>Sent</button>
      </div>

      {tab === "sent" && (
        <form onSubmit={(e) => { e.preventDefault(); loadSent(q.trim()); }} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipient or subject…"
            style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border,#e2e5e8)", font: `400 13px ${F_SANS}` }} />
          <button type="submit" style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#0A66C2", color: "#fff", font: `600 13px ${F_SANS}`, cursor: "pointer" }}>Search</button>
        </form>
      )}

      {tab === "upcoming" && (
        <p style={{ font: `400 12.5px ${F_SANS}`, color: "var(--muted,#536471)", margin: "0 0 12px", background: "var(--tag-bg,#f7f8f9)", padding: "10px 12px", borderRadius: 8 }}>
          A forecast projected from each rental&apos;s renewal schedule — nothing is queued, the daily job generates these. Rows marked <em>“if …”</em> only fire if that condition happens (e.g. a charge fails). Content is the real template that would be sent.
        </p>
      )}

      {loading ? (
        <p style={{ color: "var(--muted,#536471)", font: `400 13px ${F_SANS}` }}>Loading…</p>
      ) : tab === "upcoming" ? (
        events.length === 0 ? <p style={{ color: "var(--muted,#536471)", font: `400 13px ${F_SANS}` }}>No upcoming emails.</p> : (
          <div style={{ overflowX: "auto", border: "1px solid var(--border,#e2e5e8)", borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
              <thead><tr style={{ textAlign: "left", background: "var(--tag-bg,#f5f6f7)" }}>
                {["Projected", "Account", "To", "Email", "Fires"].map((h) => (
                  <th key={h} style={{ padding: "9px 12px", font: `600 11px ${F_SANS}`, color: "var(--muted,#536471)", textTransform: "uppercase", letterSpacing: ".03em" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={i} onClick={() => setOpen({ subject: e.subject, to: e.to, when: e.date, body: e.html, condition: e.condition })}
                    style={{ borderTop: "1px solid var(--border,#eef0f2)", cursor: "pointer" }} title="Click to preview the email">
                    <td style={{ padding: "9px 12px", font: `600 12.5px ${F_SANS}`, color: "var(--fg,#0F1419)", whiteSpace: "nowrap" }}>{day(e.date)}</td>
                    <td style={{ padding: "9px 12px", font: `400 12.5px ${F_SANS}`, color: "var(--muted,#536471)", whiteSpace: "nowrap" }}>{e.account}</td>
                    <td style={{ padding: "9px 12px", font: `400 12.5px ${F_SANS}`, color: "var(--muted,#536471)", whiteSpace: "nowrap" }}>{e.to}</td>
                    <td style={{ padding: "9px 12px", font: `500 12.5px ${F_SANS}`, color: "var(--fg,#0F1419)" }}>{e.label}</td>
                    <td style={{ padding: "9px 12px", font: `400 11.5px ${F_SANS}`, color: e.condition ? "#b45309" : "var(--st-active-fg,#128a4c)", whiteSpace: "nowrap" }}>{e.condition ? e.condition : "will send"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        rows.length === 0 ? <p style={{ color: "var(--muted,#536471)", font: `400 13px ${F_SANS}` }}>No emails found.</p> : (
          <div style={{ overflowX: "auto", border: "1px solid var(--border,#e2e5e8)", borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead><tr style={{ textAlign: "left", background: "var(--tag-bg,#f5f6f7)" }}>
                {["When", "To", "Subject", "Status"].map((h) => (
                  <th key={h} style={{ padding: "9px 12px", font: `600 11px ${F_SANS}`, color: "var(--muted,#536471)", textTransform: "uppercase", letterSpacing: ".03em" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => setOpen({ subject: r.subject, to: r.to, bcc: r.bcc, when: r.createdAt, status: r.status, error: r.error, body: r.body })}
                    style={{ borderTop: "1px solid var(--border,#eef0f2)", cursor: "pointer" }} title="Click to read the full email">
                    <td style={{ padding: "9px 12px", font: `400 12.5px ${F_SANS}`, color: "var(--muted,#536471)", whiteSpace: "nowrap" }}>{when(r.createdAt)}</td>
                    <td style={{ padding: "9px 12px", font: `500 12.5px ${F_SANS}`, color: "var(--fg,#0F1419)", whiteSpace: "nowrap" }}>{r.to}</td>
                    <td style={{ padding: "9px 12px", font: `400 12.5px ${F_SANS}`, color: "var(--fg,#0F1419)" }}>{r.subject}</td>
                    <td style={{ padding: "9px 12px" }}><span style={statusStyle(r.status)}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {open && (
        <div onClick={() => setOpen(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto", zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, maxWidth: 640, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,.25)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #eef0f2" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ font: `700 15px ${F_SANS}`, color: "#0F1419", marginBottom: 4 }}>{open.subject}</div>
                  <div style={{ font: `400 12px ${F_SANS}`, color: "#536471" }}>
                    To {open.to}{open.bcc ? ` · bcc ${open.bcc}` : ""} · {when(open.when)}{open.status ? <> · <span style={statusStyle(open.status)}>{open.status}</span></> : ""}
                  </div>
                  {open.condition && <div style={{ font: `500 12px ${F_SANS}`, color: "#b45309", marginTop: 6 }}>Only fires {open.condition}</div>}
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
