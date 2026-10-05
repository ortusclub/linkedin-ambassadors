"use client";
import { useRef, useState } from "react";
import { contactLink, type IssueContact } from "@/lib/issue-contacts";
import { ONBOARDING_ISSUES, onboardingIssueMessage, type OnboardingIssue } from "@/lib/onboarding-issue-message";
export function PipelineIssueActions({ id, name, profile, lvEmail, referrerResumeUrl, ambassador, referrer, referrerSlug, onSent, onboarded = false }: { referrerResumeUrl?: string | null; id: string; name: string; profile: string | null; lvEmail: string | null; ambassador: IssueContact; referrer: IssueContact | null; referrerSlug?: string | null; onSent: () => void; onboarded?: boolean }) {
  // Once the account is onboarded, these are live-account problems, not onboarding steps.
  const heading = onboarded ? "Account issues" : "Onboarding issues";
  const [issue, setIssue] = useState<OnboardingIssue>("email_added"), [details, setDetails] = useState("");
  const [preview, setPreview] = useState<{ recipient: "ambassador" | "referrer"; channel: keyof IssueContact; subject: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false), [result, setResult] = useState("");
  const request = useRef({ signature: "", id: "" });
  const button = { border: "1px solid var(--line,#d6e4fb)", borderRadius: 8, padding: "8px 12px", background: "var(--card,#fff)", color: "var(--link,#0a66c2)", cursor: "pointer", fontSize: 12 };
  const chLabel: Record<string, string> = { email: "Email", whatsapp: "WhatsApp", telegram: "Telegram", viber: "Viber" };
  const channels = ["email", "whatsapp", "telegram", "viber"] as const;
  const rows: { key: "referrer" | "ambassador"; role: string; display: string; contact: IssueContact | null }[] = [
    { key: "referrer", role: "Referrer", display: referrerSlug || "Referrer", contact: referrer },
    { key: "ambassador", role: "Ambassador", display: (name || "").split(" ")[0] || name || "Ambassador", contact: ambassador },
  ];
  return <div style={{ display: "grid", gap: 10 }}>
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <select aria-label={heading} disabled={busy || !!preview} style={button} value={issue} onChange={e => setIssue(e.target.value as OnboardingIssue)}>{Object.entries(ONBOARDING_ISSUES).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select>
    </div>
    {issue === "other" && <textarea aria-label="Issue details" disabled={busy || !!preview} placeholder="Explain the issue and what they need to do…" value={details} onChange={e => setDetails(e.target.value)} maxLength={3000} rows={3} style={button} />}
    {rows.map(row => row.contact ? (() => {
      const valid = channels.filter(ch => !!contactLink(ch, row.contact?.[ch], ""));
      return <div key={row.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 11px", background: "var(--band,#f6f7f9)", borderRadius: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ font: "700 13px var(--font-sans,system-ui,sans-serif)", color: "var(--fg,#111)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.display}</div>
          <div style={{ font: "500 11.5px var(--font-sans,system-ui,sans-serif)", color: "var(--muted2,#9aa0a6)" }}>{row.role}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {valid.length ? valid.map(ch => {
            const blocked = busy || (issue === "other" && !details.trim());
            return <button key={ch} style={{ ...button, opacity: blocked ? .5 : 1 }} disabled={blocked} title="Review the message before sending" onClick={() => { setResult(""); setPreview({ recipient: row.key, channel: ch, ...onboardingIssueMessage(issue, row.key, name, profile, lvEmail, details, referrerResumeUrl) }); }}>{chLabel[ch]}</button>;
          }) : <span style={{ font: "500 11.5px var(--font-sans,system-ui,sans-serif)", color: "var(--muted2,#9aa0a6)" }}>No contact saved</span>}
        </div>
      </div>;
    })() : null)}
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
