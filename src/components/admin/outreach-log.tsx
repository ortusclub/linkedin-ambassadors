"use client";

// Shared outreach / notes-and-convos tracker. Extracted so the accounts
// inventory page can reuse the exact card the pipeline uses: a timestamped
// touch log (WhatsApp / Email / Text / Note …), a "Next" follow-up date, and a
// handler label. Self-contained (its own styles + helpers) so it carries no
// dependency on any one page's row type.

import { useState } from "react";

export type Touch = { ch: string; text: string; by?: string; at: string };

const F_SANS = "var(--font-sans),system-ui,sans-serif";

const TOUCH: Record<string, [string, string, string]> = {
  whatsapp: ["WhatsApp", "--green-chip-bg,#e6f4ea", "--green-chip-text,#188038"],
  viber: ["Viber", "--st-conv-bg,#efe8fd", "--st-conv-fg,#6d28d9"],
  telegram: ["Telegram", "--blue-chip-bg,#e8f0fe", "--blue-chip-text,#1a56db"],
  email: ["Email", "--blue-chip-bg,#e8f0fe", "--blue-chip-text,#1a56db"],
  call: ["Call", "--st-unreach-bg,#fdecea", "--st-unreach-fg,#c0392b"],
  text: ["Text", "--st-conv-bg,#efe8fd", "--st-conv-fg,#6d28d9"],
  reply: ["Reply", "--st-replied-bg,#e6f4ea", "--st-replied-fg,#188038"],
  note: ["Note", "--tag-bg,#f1f1f2", "--muted,#6b7280"],
};

const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
const touchLabel = (ch: string) => (TOUCH[ch] || TOUCH.note)[0];
const touchChipStyle = (ch: string): React.CSSProperties => {
  const c = TOUCH[ch] || TOUCH.note;
  return { font: `600 9.5px ${F_SANS}`, letterSpacing: ".04em", textTransform: "uppercase", padding: "4px 0", borderRadius: 6, flex: "none", width: 72, textAlign: "center", background: `var(${c[1]})`, color: `var(${c[2]})` };
};
const lastTouchAt = (log: Touch[] | null) => (log && log.length ? fmtDateTime(log[log.length - 1].at) : "");
const touchCount = (log: Touch[] | null) => (log || []).filter((t) => t.ch !== "note").length;

const inputCss: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "var(--input-bg,#fff)", border: "1px solid var(--input-border,#dcdce0)", borderRadius: 8, padding: "7px 9px", font: `500 13px ${F_SANS}`, color: "var(--text,#111)", outline: "none" };
const btnSec: React.CSSProperties = { font: `600 12px ${F_SANS}`, color: "var(--btn-secondary-fg,#333)", background: "var(--btn-secondary-bg,#fff)", border: "1px solid var(--btn-secondary-border,#dcdce0)", padding: "7px 12px", borderRadius: 8, cursor: "pointer" };

export function OutreachLog({
  log,
  nextFollowUp,
  handler,
  channel = "whatsapp",
  busy = false,
  onLog,
  onSetFollowUp,
  onDelete,
}: {
  log: Touch[] | null;
  nextFollowUp: string | null;
  handler?: string | null;
  channel?: "viber" | "telegram" | "whatsapp";
  busy?: boolean;
  onLog: (ch: string, text: string, by: string) => void | Promise<void>;
  onSetFollowUp: (iso: string | null) => void;
  onDelete: (at: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [by, setBy] = useState("");
  const send = async (ch: string) => { await onLog(ch, draft.trim(), by.trim()); setDraft(""); };
  const followVal = nextFollowUp ? new Date(nextFollowUp).toISOString().slice(0, 10) : "";
  return (
    <div style={{ border: "1px solid var(--divider,#e3e3e6)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", background: "var(--band,#f6f7f8)", borderBottom: "1px solid var(--divider,#e3e3e6)", flexWrap: "wrap" }}>
        <span style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted,#777)" }}>{touchCount(log)} {touchCount(log) === 1 ? "touch" : "touches"} · last {lastTouchAt(log) || "—"}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: `500 11.5px ${F_SANS}`, color: "var(--muted,#777)" }}>Next <input type="date" value={followVal} onChange={(e) => onSetFollowUp(e.target.value ? new Date(e.target.value).toISOString() : null)} style={{ ...inputCss, width: "auto", padding: "4px 7px", cursor: "pointer" }} /></span>
          <span style={{ font: `500 11.5px ${F_SANS}`, color: "var(--muted,#777)" }}>Handler <b style={{ color: "var(--fg,#333)" }}>{handler || "—"}</b></span>
        </div>
      </div>
      <div style={{ padding: "8px 14px" }}>
        {log && log.length ? [...log].reverse().map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "6px 0" }}>
            <span style={touchChipStyle(t.ch)}>{touchLabel(t.ch)}</span>
            <span style={{ flex: 1, font: `500 12.5px ${F_SANS}`, color: "var(--text2,#333)", lineHeight: 1.4 }}>{t.text}</span>
            <span style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2,#9aa0a6)", whiteSpace: "nowrap" }}>{(t.by ? t.by + " · " : "") + fmtDateTime(t.at)}</span>
            <span onClick={() => { if (confirm("Delete this outreach entry?")) onDelete(t.at); }} title="Delete entry" style={{ font: `600 13px ${F_SANS}`, color: "var(--muted2,#9aa0a6)", cursor: "pointer", flex: "none", lineHeight: 1.2 }}>×</span>
          </div>
        )) : <span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted,#777)" }}>No outreach logged yet.</span>}
      </div>
      <div style={{ padding: "2px 14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What did you say? — logged with the touch (optional)" style={{ ...inputCss, flex: 1, minWidth: 220 }} />
          <input value={by} onChange={(e) => setBy(e.target.value)} placeholder="Who sent it?" style={{ ...inputCss, width: 150, flex: "none" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span style={{ font: `600 10.5px ${F_SANS}`, color: "var(--muted2,#9aa0a6)" }}>LOG</span>
          {[channel, "email", "text", "note"].map((ch) => <button key={ch} onClick={() => send(ch)} disabled={busy} style={btnSec}>+ {touchLabel(ch)}</button>)}
        </div>
      </div>
    </div>
  );
}
