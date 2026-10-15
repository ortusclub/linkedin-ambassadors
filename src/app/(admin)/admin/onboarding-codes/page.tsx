"use client";

import { useCallback, useEffect, useState } from "react";

type Row = { id: string; address: string; subject: string | null; confirmUrl: string | null; code: string | null; receivedAt: string };

const F = "var(--font-sans), system-ui, sans-serif";

function ago(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function OnboardingCodesPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  const load = useCallback(async (query: string) => {
    try {
      const r = await fetch(`/api/admin/onboarding-codes${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      if (!r.ok) throw new Error();
      const j = await r.json();
      setRows(j.rows);
      setErr(false);
    } catch { setErr(true); }
  }, []);

  useEffect(() => { void load(""); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => void load(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q, load]);
  // Refresh every 15s so a freshly-arrived code shows without a manual reload.
  useEffect(() => {
    const t = setInterval(() => void load(q.trim()), 15000);
    return () => clearInterval(t);
  }, [q, load]);

  const copy = (key: string, text: string) => { navigator.clipboard?.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1200); };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "8px 2px 60px" }}>
      <h1 style={{ font: `800 22px ${F}`, color: "var(--fg,#111)", margin: "0 0 4px" }}>Verification codes</h1>
      <p style={{ font: `500 13px ${F}`, color: "var(--muted,#8a93a3)", margin: "0 0 16px", lineHeight: 1.5 }}>
        LinkedIn confirmation links &amp; codes captured for any email on our onboarding domains — including ones added to LinkedIn
        manually. If a code isn’t here, tap “Resend verification link” on LinkedIn and wait a moment (this list auto-refreshes).
      </p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by email address or name (e.g. beverly.tan)…"
        style={{ width: "100%", boxSizing: "border-box", font: `500 14px ${F}`, padding: "11px 14px", borderRadius: 10, border: "1px solid var(--card-border,#e3e3e6)", background: "var(--card,#fff)", color: "var(--fg,#111)", marginBottom: 16 }}
      />

      {err && <p style={{ font: `600 13px ${F}`, color: "var(--st-cancel-fg,#c0392b)" }}>Couldn’t load — refresh the page.</p>}
      {rows === null && !err && <p style={{ font: `500 13px ${F}`, color: "var(--muted,#8a93a3)" }}>Loading…</p>}
      {rows !== null && rows.length === 0 && <p style={{ font: `500 13px ${F}`, color: "var(--muted,#8a93a3)" }}>No captured codes yet{q ? " for that search" : ""}.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows?.map((r) => (
          <div key={r.id} style={{ border: "1px solid var(--card-border,#e8eaed)", borderRadius: 12, padding: "13px 15px", background: "var(--card,#fff)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <span style={{ font: `700 14px ${F}`, color: "var(--fg,#111)", wordBreak: "break-all" }}>{r.address}</span>
              <span style={{ font: `500 11.5px ${F}`, color: "var(--muted2,#9aa0a6)", flex: "none" }}>{ago(r.receivedAt)} · {new Date(r.receivedAt).toLocaleString()}</span>
            </div>
            {r.subject && <div style={{ font: `500 12px ${F}`, color: "var(--muted,#8a93a3)", margin: "3px 0 0" }}>{r.subject}</div>}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
              {r.code && (
                <button type="button" onClick={() => copy(`c${r.id}`, r.code!)} style={{ font: `700 16px ${F}`, letterSpacing: ".12em", padding: "7px 13px", borderRadius: 9, border: "none", background: "var(--neutral-bg,#eef1f5)", color: "var(--fg,#111)", cursor: "pointer" }}>
                  {copied === `c${r.id}` ? "✓ Copied" : r.code}
                </button>
              )}
              {r.confirmUrl && (
                <>
                  <a href={r.confirmUrl} target="_blank" rel="noopener noreferrer" style={{ font: `700 13px ${F}`, padding: "8px 14px", borderRadius: 9, background: "var(--st-active-fg,#16a34a)", color: "#fff", textDecoration: "none" }}>Open confirm link ↗</a>
                  <button type="button" onClick={() => copy(`u${r.id}`, r.confirmUrl!)} style={{ font: `700 13px ${F}`, padding: "8px 14px", borderRadius: 9, border: "1px solid var(--card-border,#dde1e8)", background: "var(--card,#fff)", color: "var(--fg,#111)", cursor: "pointer" }}>{copied === `u${r.id}` ? "✓ Copied" : "Copy link"}</button>
                </>
              )}
              {!r.code && !r.confirmUrl && <span style={{ font: `500 12px ${F}`, color: "var(--muted2,#9aa0a6)" }}>No code/link found in this email.</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
