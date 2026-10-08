"use client";
import { useRef, useState } from "react";
import { contactLink, type IssueContact } from "@/lib/issue-contacts";
import { referralInviteMessage, type InviteRecipient } from "@/lib/referral-invite-message";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://linkedvelocity.com";

// Shown on onboarded + paid pipeline rows: invite the ambassador to become a referrer
// (opt-in — no portal yet) and re-engage the referrer who brought them in (live portal link).
export function PipelineReferralInvite({ id, ambassadorName, referrerName, ambassador, referrer, referrerToken, ambassadorPortalToken, onSent }: {
  id: string; ambassadorName: string; referrerName: string | null;
  ambassador: IssueContact; referrer: IssueContact | null; referrerToken: string | null;
  ambassadorPortalToken?: string | null; onSent: () => void;
}) {
  const portalUrl = referrerToken ? `${APP_URL}/m/${referrerToken}` : null;
  // Set only when this ambassador is already a referrer too — then we link their own portal
  // instead of the opt-in copy.
  const ambassadorPortalUrl = ambassadorPortalToken ? `${APP_URL}/m/${ambassadorPortalToken}` : null;
  const [preview, setPreview] = useState<{ recipient: InviteRecipient; channel: keyof IssueContact; subject: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false), [result, setResult] = useState("");
  const request = useRef({ signature: "", id: "" });
  const button = { border: "1px solid var(--line,#d6e4fb)", borderRadius: 8, padding: "8px 12px", background: "var(--card,#fff)", color: "var(--link,#0a66c2)", cursor: "pointer", fontSize: 12 };

  const build = (recipient: InviteRecipient, channel: keyof IssueContact) => {
    const name = recipient === "ambassador" ? ambassadorName : (referrerName || "");
    return referralInviteMessage(recipient, channel === "email" ? "email" : "chat", name, recipient === "referrer" ? portalUrl : ambassadorPortalUrl);
  };

  return <div style={{ display: "grid", gap: 10 }}>
    <b style={{ fontSize: 12 }}>Referral program invite</b>
    <small style={{ color: "var(--muted,#647189)" }}>Invite {ambassadorName} to refer (₱500) or onboard accounts themselves (up to ₱1,000){portalUrl ? ", and nudge the referrer who brought them in" : ""}.</small>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{(["email", "whatsapp", "telegram", "viber"] as const).flatMap(channel => (["ambassador", "referrer"] as const).map(recipient => {
      const contact = recipient === "ambassador" ? ambassador : referrer;
      const valid = !!contactLink(channel, contact?.[channel], "");
      return <button key={`${channel}-${recipient}`} style={{ ...button, opacity: valid ? 1 : .45 }} disabled={!valid || busy} title={valid ? "Review the message before sending" : `No ${recipient} ${channel} contact saved`} onClick={() => { setResult(""); setPreview({ recipient, channel, ...build(recipient, channel) }); }}>{({ email: "Email", whatsapp: "WhatsApp", telegram: "Telegram", viber: "Viber" })[channel]} {recipient}</button>;
    }))}</div>
    {preview && <div role="dialog" aria-label="Review referral invite message" style={{ border: "1px solid var(--line,#d6e4fb)", borderRadius: 12, padding: 16, display: "grid", gap: 10 }}>
      <b>Review message to {preview.recipient}</b><span>To: {(preview.recipient === "ambassador" ? ambassador : referrer)?.[preview.channel]}</span>
      {preview.channel === "email" && <input aria-label="Email subject" style={button} value={preview.subject} onChange={e => setPreview({ ...preview, subject: e.target.value })} />}
      <textarea aria-label="Invite message" style={{ ...button, color: "var(--fg,#111)", width: "100%", boxSizing: "border-box" }} rows={10} value={preview.text} onChange={e => setPreview({ ...preview, text: e.target.value })} />
      {preview.channel !== "email" && <small>Opens the chat for you to review and send. Viber copies the message so you can paste it.</small>}
      <div style={{ display: "flex", gap: 8 }}><button style={button} disabled={busy} onClick={() => setPreview(null)}>Cancel</button><button style={button} disabled={busy || !preview.text.trim() || !preview.subject.trim()} onClick={async () => {
        setBusy(true); setResult("");
        try {
          if (preview.channel === "email") {
            const signature = JSON.stringify(preview);
            if (signature !== request.current.signature) request.current = { signature, id: crypto.randomUUID() };
            const response = await fetch(`/api/admin/ambassadors/${id}/referral-invite`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient: preview.recipient, subject: preview.subject, text: preview.text, requestId: request.current.id }) });
            const data = await response.json(); if (!response.ok) throw new Error(data.error);
            setResult(`Email sent to ${data.to}.`); onSent();
          } else {
            const href = contactLink(preview.channel, (preview.recipient === "ambassador" ? ambassador : referrer)?.[preview.channel], preview.text);
            if (preview.channel === "viber") await navigator.clipboard.writeText(preview.text);
            if (href) window.open(href, "_blank", "noopener,noreferrer");
          }
          setPreview(null);
        } catch (e) { setResult(e instanceof Error ? e.message : "Could not prepare the message."); } finally { setBusy(false); }
      }}>{busy ? "Sending…" : preview.channel === "email" ? "Send email" : preview.channel === "viber" ? "Copy message & open Viber" : "Open chat"}</button></div>
    </div>}
    {result && <p role="status">{result}</p>}
  </div>;
}
