"use client";

import { useState, useRef } from "react";
import { accountIssueMessage, ACCOUNT_ISSUES, ISSUE_KEYS, type AccountIssue } from "@/lib/account-issue-message";
import { contactLink, type IssueContact } from "@/lib/issue-contacts";

export function IssueActions({ originalEmail, lvEmail, referralPartner, from, accountId, name, profile, ambassador, referrer, onSent }: { originalEmail: string | null; lvEmail: string | null; referralPartner: string | null; from: string; accountId: string; name: string; profile?: string | null; ambassador: IssueContact; referrer?: IssueContact | null; onSent: () => void }) {
  const [issue, setIssue] = useState<AccountIssue>("lost_access");
  const [details, setDetails] = useState("");
  const [preview, setPreview] = useState<{ recipient: "ambassador" | "referrer"; subject: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const validIssue = issue !== "other" || !!details.trim();
  const request = useRef<{ signature: string; id: string } | null>(null);
  const send = async (recipient: "ambassador" | "referrer") => {
    if (busy || !validIssue || !preview || !preview.subject.trim() || !preview.text.trim()) return;
    setBusy(true); setResult("");
    const signature = JSON.stringify({ recipient, issue, details, subject: preview.subject, text: preview.text });
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/issue-email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient, issue, details, subject: preview.subject, text: preview.text, requestId: request.current.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send email");
      setResult(`Email sent to ${data.to}.`); setPreview(null); onSent();
    } catch (error) { setResult(error instanceof Error ? error.message : "Could not send email"); }
    finally { setBusy(false); }
  };
  return <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
    <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--muted)" }}>Access issues</span>
    <span style={{ fontSize: 12, color: "var(--muted)" }}>Review and edit emails before sending from LinkedVelocity. WhatsApp and Telegram open a message for you to send. Viber opens the prepared message; select the recipient in Viber.</span>
    <label style={{ fontSize: 12 }}>Issue <select disabled={busy} value={issue} onChange={e => setIssue(e.target.value as typeof issue)}>{ISSUE_KEYS.map(key => <option key={key} value={key}>{ACCOUNT_ISSUES[key].label}</option>)}</select></label>
    {issue === "other" && <textarea required aria-label="Issue details and required action" disabled={busy} value={details} onChange={e => setDetails(e.target.value)} maxLength={3000} placeholder="Explain the issue and what they need to do to fix it…" rows={3} style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--card-border)", borderRadius: 8, padding: 10, background: "var(--card)", color: "var(--text)" }} />}
    <details><summary style={{ cursor: "pointer", fontSize: 12 }}>Preview payment-suspension message</summary><pre style={{ whiteSpace: "pre-wrap", font: "inherit", fontSize: 12 }}>{accountIssueMessage(name, "ambassador", issue, details, profile, referralPartner, { original: originalEmail, lv: lvEmail }).subject}{"\n\n"}{accountIssueMessage(name, "ambassador", issue, details, profile, referralPartner, { original: originalEmail, lv: lvEmail }).text}</pre><p style={{ fontSize: 12 }}>The referrer version identifies the referred account and asks them to help the ambassador resolve it.</p></details>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {(["email", "whatsapp", "telegram", "viber"] as const).flatMap(channel => (["referrer", "ambassador"] as const).map(recipient => {
        const contact = recipient === "ambassador" ? ambassador : referrer;
        const message = accountIssueMessage(name, recipient, issue, details, profile, referralPartner, { original: originalEmail, lv: lvEmail }).text;
        const href = validIssue ? contactLink(channel, contact?.[channel], message) : null;
        const label = `${{ email: "Email", whatsapp: "WhatsApp", telegram: "Telegram", viber: "Viber" }[channel]} ${recipient}`;
        const style = { fontSize: 12, fontWeight: 600, border: "1px solid var(--card-border)", borderRadius: 8, padding: "8px 10px", background: "var(--card)", color: "var(--link)", textDecoration: "none" };
        if (channel === "email") return <button key={label} type="button" disabled={busy || !href} onClick={() => setPreview({ recipient, ...accountIssueMessage(name, recipient, issue, details, profile, referralPartner, { original: originalEmail, lv: lvEmail }) })} title={!validIssue ? "Explain the other issue first" : !href ? `No ${recipient} email saved` : `Review email to ${contact?.email}`} style={{ ...style, cursor: "pointer", opacity: busy || !href ? 0.45 : 1 }}>{busy ? "Sending…" : `Email ${recipient}`}</button>;
        if (channel === "viber" && href) return <a key={label} href={href} style={style} title={`Choose ${contact?.viber} in Viber to send this prepared message`}>{label} ↗</a>;
        return href ? <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={style}>{label} ↗</a>
          : <button key={label} type="button" disabled title={`No usable ${channel} contact saved for this ${recipient}${channel === "whatsapp" ? "; include the country code" : ""}`} style={{ ...style, opacity: 0.45, cursor: "not-allowed" }}>{label} · unavailable</button>;
      }))}
    </div>
    {preview && <div role="dialog" aria-modal="true" aria-label="Review email" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => e.stopPropagation()}>
      <div style={{ background: "var(--card)", color: "var(--text)", borderRadius: 16, padding: 24, width: 680, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <strong>Review email before sending</strong>
        <span>From: {from}</span>
        <span>To: {preview.recipient === "ambassador" ? ambassador.email : referrer?.email}</span>
        <label>Subject<input aria-label="Email subject" disabled={busy} value={preview.subject} onChange={e => setPreview({ ...preview, subject: e.target.value })} style={{ display: "block", width: "100%", boxSizing: "border-box", padding: 10 }} /></label>
        <label>Message<textarea aria-label="Email message" disabled={busy} rows={17} value={preview.text} onChange={e => setPreview({ ...preview, text: e.target.value })} style={{ display: "block", width: "100%", boxSizing: "border-box", padding: 10 }} /></label>
        {result && <span role="alert">{result}</span>}
        <div style={{ display: "flex", gap: 10 }}><button type="button" disabled={busy} onClick={() => setPreview(null)}>Cancel</button><button type="button" disabled={busy || !preview.subject.trim() || !preview.text.trim()} onClick={() => send(preview.recipient)}>{busy ? "Sending…" : "Send email"}</button></div>
      </div>
    </div>}
    {result && <span role="status" style={{ fontSize: 12 }}>{result}</span>}
  </div>;
}
