"use client";
import { useRef, useState } from "react";
import { contactLink, type IssueContact } from "@/lib/issue-contacts";
import { ONBOARDING_ISSUES, onboardingIssueMessage, type OnboardingIssue } from "@/lib/onboarding-issue-message";
export function PipelineIssueActions({ id, name, profile, lvEmail, referrerResumeUrl, ambassador, referrer, onSent, onboarded = false }: { referrerResumeUrl?: string | null; id: string; name: string; profile: string | null; lvEmail: string | null; ambassador: IssueContact; referrer: IssueContact | null; onSent: () => void; onboarded?: boolean }) {
  // Once the account is onboarded, these are live-account problems, not onboarding steps.
  const heading = onboarded ? "Account issues" : "Onboarding issues";
  const [issue, setIssue] = useState<OnboardingIssue>("email_added"), [details, setDetails] = useState("");
  const [preview, setPreview] = useState<{ recipient: "ambassador" | "referrer"; channel: keyof IssueContact; subject: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false), [result, setResult] = useState("");
  const request = useRef({ signature: "", id: "" });
  const button = { border: "1px solid var(--line,#d6e4fb)", borderRadius: 8, padding: "8px 12px", background: "var(--card,#fff)", color: "var(--link,#0a66c2)", cursor: "pointer", fontSize: 12 };
  return <div style={{ display: "grid", gap: 10 }}>
    <b style={{ fontSize: 12 }}>{heading}</b>
    <label>Issue <select aria-label={heading} disabled={busy || !!preview} style={{ ...button, marginLeft: 8 }} value={issue} onChange={e => setIssue(e.target.value as OnboardingIssue)}>{Object.entries(ONBOARDING_ISSUES).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
    {issue === "other" && <textarea aria-label="Issue details" disabled={busy || !!preview} placeholder="Explain the issue and what they need to do…" value={details} onChange={e => setDetails(e.target.value)} maxLength={3000} rows={3} style={button} />}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{(["email", "whatsapp", "telegram", "viber"] as const).flatMap(channel => (["referrer", "ambassador"] as const).map(recipient => {
      const contact = recipient === "ambassador" ? ambassador : referrer;
      const valid = !!contactLink(channel, contact?.[channel], "") && (issue !== "other" || !!details.trim());
      return <button key={`${channel}-${recipient}`} style={{ ...button, opacity: valid ? 1 : .45 }} disabled={!valid || busy} title={valid ? "Review the message before sending" : `No ${recipient} ${channel} contact saved, or issue details are missing`} onClick={() => { setResult(""); setPreview({ recipient, channel, ...onboardingIssueMessage(issue, recipient, name, profile, lvEmail, details, referrerResumeUrl) }); }}>{({ email: "Email", whatsapp: "WhatsApp", telegram: "Telegram", viber: "Viber" })[channel]} {recipient}</button>;
    }))}</div>
    {preview && <div role="dialog" aria-label="Review onboarding issue message" style={{ border: "1px solid var(--line,#d6e4fb)", borderRadius: 12, padding: 16, display: "grid", gap: 10 }}>
      <b>Review message to {preview.recipient}</b><span>To: {(preview.recipient === "ambassador" ? ambassador : referrer)?.[preview.channel]}</span>
      {preview.channel === "email" && <input aria-label="Email subject" style={button} value={preview.subject} onChange={e => setPreview({ ...preview, subject: e.target.value })} />}
      <textarea aria-label="Issue message" style={{ ...button, color: "var(--fg,#111)", width: "100%", boxSizing: "border-box" }} rows={12} value={preview.text} onChange={e => setPreview({ ...preview, text: e.target.value })} />
      {preview.channel !== "email" && <small>Opens the chat for you to review and send. Viber copies the message so you can paste it.</small>}
      <div style={{ display: "flex", gap: 8 }}><button style={button} disabled={busy} onClick={() => setPreview(null)}>Cancel</button><button style={button} disabled={busy || !preview.text.trim() || !preview.subject.trim()} onClick={async () => {
        setBusy(true); setResult("");
        try {
          if (preview.channel === "email") {
            const signature = JSON.stringify({ ...preview, issue, details });
            if (signature !== request.current.signature) request.current = { signature, id: crypto.randomUUID() };
            const response = await fetch(`/api/admin/ambassadors/${id}/issue-email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...preview, issue, details, requestId: request.current.id }) });
            const data = await response.json(); if (!response.ok) throw new Error(data.error);
            setResult(`Email sent to ${data.to}.`); onSent();
          } else {
            const href = contactLink(preview.channel, (preview.recipient === "ambassador" ? ambassador : referrer)?.[preview.channel], preview.text);
            if (preview.channel === "viber") await navigator.clipboard.writeText(preview.text);
            if (href) window.open(href, "_blank", "noopener,noreferrer");
          }
          setPreview(null);
        } catch(e) { setResult(e instanceof Error ? e.message : "Could not prepare the message."); } finally { setBusy(false); }
      }}>{busy ? "Sending…" : preview.channel === "email" ? "Send email" : preview.channel === "viber" ? "Copy message & open Viber" : "Open chat"}</button></div>
    </div>}
    {result && <p role="status">{result}</p>}
  </div>;
}
