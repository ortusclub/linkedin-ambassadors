"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./issue-actions.module.css";
import { accountIssueMessage, ACCOUNT_ISSUES, ISSUE_KEYS, type AccountIssue } from "@/lib/account-issue-message";
import { includeIssueLoginDetails } from "@/lib/issue-login-details";
import { contactLink, type IssueContact } from "@/lib/issue-contacts";

export function IssueActions({ twoFactorReceivedAt, originalEmail, lvEmail, referralPartner, from, accountId, name, profile, ambassador, referrer, onSent }: { twoFactorReceivedAt: string | null; originalEmail: string | null; lvEmail: string | null; referralPartner: string | null; from: string; accountId: string; name: string; profile?: string | null; ambassador: IssueContact; referrer?: IssueContact | null; onSent: () => void }) {
  const [codeLink, setCodeLink] = useState("");
  useEffect(() => {
    let active = true;
    setCodeLink("");
    fetch(`/api/admin/accounts/${accountId}/code-link`, { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(data => { if (active && data?.url) setCodeLink(data.url); }).catch(() => {});
    return () => { active = false; };
  }, [accountId]);
  const prepareMessage = (recipient: "ambassador" | "referrer") => {
    const message = accountIssueMessage(name, recipient, issue, details, profile, referralPartner, { original: originalEmail, lv: lvEmail, twoFactorReceivedAt });
    if (recipient === "ambassador" && codeLink) message.text = message.text.replaceAll("https://linkedvelocity.com/account-code", codeLink);
    return message;
  };
  const [issue, setIssue] = useState<AccountIssue>("lost_access");
  const [details, setDetails] = useState("");
  const [preview, setPreview] = useState<{ channel: "email" | "whatsapp" | "telegram" | "viber"; recipient: "ambassador" | "referrer"; subject: string; text: string } | null>(null);
  const previewChannelName = preview?.channel === "viber" ? "Viber" : preview?.channel === "telegram" ? "Telegram" : "WhatsApp";
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const validIssue = issue !== "other" || !!details.trim();
  const request = useRef<{ signature: string; id: string } | null>(null);
  const send = async (recipient: "ambassador" | "referrer") => {
    if (busy || !validIssue || !preview || preview.channel !== "email" || !preview.subject.trim() || !preview.text.trim()) return;
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
    <span style={{ fontSize: 12, color: "var(--muted)" }}>Review and edit emails before sending from LinkedVelocity. WhatsApp, Telegram and Viber let you review the message and choose whether to include login details. Viber copies the message for you to paste into the chat.</span>
    <label className={styles.issueField}><span>Issue type</span><select className={styles.issueSelect} disabled={busy} value={issue} onChange={e => setIssue(e.target.value as typeof issue)}>{ISSUE_KEYS.map(key => <option key={key} value={key}>{ACCOUNT_ISSUES[key].label}</option>)}</select></label>
    {issue === "other" && <textarea required aria-label="Issue details and required action" disabled={busy} value={details} onChange={e => setDetails(e.target.value)} maxLength={3000} placeholder="Explain the issue and what they need to do to fix it…" rows={3} style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--card-border)", borderRadius: 8, padding: 10, background: "var(--card)", color: "var(--text)" }} />}
    <details><summary style={{ cursor: "pointer", fontSize: 12 }}>Preview payment-suspension message</summary><pre style={{ whiteSpace: "pre-wrap", font: "inherit", fontSize: 12 }}>{accountIssueMessage(name, "ambassador", issue, details, profile, referralPartner, { original: originalEmail, lv: lvEmail, twoFactorReceivedAt }).subject}{"\n\n"}{accountIssueMessage(name, "ambassador", issue, details, profile, referralPartner, { original: originalEmail, lv: lvEmail, twoFactorReceivedAt }).text}</pre><p style={{ fontSize: 12 }}>The referrer version identifies the referred account and asks them to help the ambassador resolve it.</p></details>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {(["email", "whatsapp", "telegram", "viber"] as const).flatMap(channel => (["referrer", "ambassador"] as const).map(recipient => {
        const contact = recipient === "ambassador" ? ambassador : referrer;
        const message = prepareMessage(recipient).text;
        const href = validIssue ? contactLink(channel, contact?.[channel], message) : null;
        const label = `${{ email: "Email", whatsapp: "WhatsApp", telegram: "Telegram", viber: "Viber" }[channel]} ${recipient}`;
        const style = { fontSize: 12, fontWeight: 600, border: "1px solid var(--card-border)", borderRadius: 8, padding: "8px 10px", background: "var(--card)", color: "var(--link)", textDecoration: "none" };
        return <button key={label} type="button" disabled={busy || !href} onClick={() => { setResult(""); setPreview({ channel, recipient, ...prepareMessage(recipient) }); }} title={!validIssue ? "Explain the other issue first" : !href ? `No ${recipient} ${channel} contact saved` : `Review message to ${contact?.[channel]}`} style={{ ...style, cursor: "pointer", opacity: busy || !href ? 0.45 : 1 }}>{label}</button>;
      }))}
    </div>
    {preview && <div role="dialog" aria-modal="true" aria-label={preview.channel === "email" ? "Review email" : `Review ${previewChannelName} message`} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={e => e.stopPropagation()}>
      <div style={{ background: "var(--card)", color: "var(--text)", borderRadius: 16, padding: 24, width: 680, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <strong>{preview.channel === "email" ? "Review email before sending" : `Review ${previewChannelName} message`}</strong>
        {preview.channel === "email" && <span>From: {from}</span>}
        <span>To: {preview.recipient === "ambassador" ? ambassador[preview.channel] : referrer?.[preview.channel]}</span>
        {preview.channel === "email" && <label>Subject<input aria-label="Email subject" disabled={busy} value={preview.subject} onChange={e => setPreview({ ...preview, subject: e.target.value })} style={{ display: "block", width: "100%", boxSizing: "border-box", padding: 10 }} /></label>}
        {preview.channel !== "email" && <p>Would you like to include the saved login email, password and private authenticator link beside the sign-in instructions?</p>}
        {<button className={styles.cancel} type="button" disabled={busy || !codeLink || preview.text.includes("Saved login password:")} onClick={async () => {
          setBusy(true); setResult("");
          try {
            const response = await fetch(`/api/admin/accounts/${accountId}/issue-email`, { cache: "no-store" });
            const login = await response.json();
            if (!response.ok) throw new Error(login.error || "Could not load saved login details");
            setPreview({ ...preview, text: includeIssueLoginDetails(preview.text, login.email, login.password, codeLink, preview.recipient === "referrer" ? name : undefined) });
          } catch (error) { setResult(error instanceof Error ? error.message : "Could not load saved login details"); }
          finally { setBusy(false); }
        }}>{preview.text.includes("Saved login password:") ? "Login details included" : preview.channel !== "email" ? "Yes, include login details" : "Include saved login details"}</button>}
        <label>Message<textarea aria-label={preview.channel === "email" ? "Email message" : `${previewChannelName} message`} disabled={busy} rows={17} value={preview.text} onChange={e => setPreview({ ...preview, text: e.target.value })} style={{ display: "block", width: "100%", boxSizing: "border-box", padding: 10 }} /></label>
        {preview.channel === "viber" && <p>We’ll copy the complete message and open this person’s Viber chat. Paste the message in Viber, check the recipient, then send. If Viber does not open the chat, find the number shown above in Viber and paste there.</p>}
        {result && <span role="alert">{result}</span>}
        <div className={styles.actions}>
          <button className={styles.cancel} type="button" disabled={busy} onClick={() => setPreview(null)}>Cancel</button>
          <button className={styles.send} type="button" aria-busy={busy} disabled={busy || !preview.text.trim() || (preview.channel === "email" && !preview.subject.trim())} onClick={async () => {
            if (preview.channel === "email") { void send(preview.recipient); return; }
            const contact = preview.recipient === "ambassador" ? ambassador : referrer;
            const href = contactLink(preview.channel, contact?.[preview.channel], preview.text);
            if (href) {
              if (preview.channel === "viber") {
                setBusy(true);
                try { await navigator.clipboard.writeText(preview.text); }
                catch { setResult("Clipboard access was blocked. Copy the message from the preview, then open Viber and paste it into the recipient’s chat."); setBusy(false); return; }
                setBusy(false);
              }
              window.open(href, "_blank", "noopener,noreferrer"); setPreview(null);
            }
          }}>{busy ? "Preparing…" : preview.channel === "email" ? "Send email" : preview.text.includes("Saved login password:") ? preview.channel === "viber" ? "Copy message & open Viber" : `Open ${previewChannelName}` : "No, continue without login details"}</button>
        </div>
      </div>
    </div>}
    {result && <span role="status" style={{ fontSize: 12 }}>{result}</span>}
  </div>;
}
