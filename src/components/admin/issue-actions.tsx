"use client";

import { contactLink, type IssueContact } from "@/lib/issue-contacts";

export function IssueActions({ name, ambassador, referrer }: { name: string; ambassador: IssueContact; referrer?: IssueContact | null }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
    <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--muted)" }}>Access issues</span>
    <span style={{ fontSize: 12, color: "var(--muted)" }}>Lost access? Open a message to review and send.</span>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {(["email", "whatsapp", "telegram"] as const).flatMap(channel => (["referrer", "ambassador"] as const).map(recipient => {
        const contact = recipient === "ambassador" ? ambassador : referrer;
        const message = recipient === "ambassador"
          ? `Hi ${name}, we have lost access to your LinkedIn account. Could you help us restore access and let us know whether you can sign in and receive the verification emails? Thank you, LinkedVelocity.`
          : `Hi, we have lost access to ${name}'s LinkedIn account. Could you contact the ambassador and help us restore access? Please check whether they can sign in and receive the verification emails. Thank you, LinkedVelocity.`;
        const href = contactLink(channel, contact?.[channel], message);
        const label = `${{ email: "Email", whatsapp: "WhatsApp", telegram: "Telegram" }[channel]} ${recipient}`;
        const style = { fontSize: 12, fontWeight: 600, border: "1px solid var(--card-border)", borderRadius: 8, padding: "8px 10px", background: "var(--card)", color: "var(--link)", textDecoration: "none" };
        return href ? <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={style}>{label} ↗</a>
          : <button key={label} type="button" disabled title={`No usable ${channel} contact saved for this ${recipient}${channel === "whatsapp" ? "; include the country code" : ""}`} style={{ ...style, opacity: 0.45, cursor: "not-allowed" }}>{label} · unavailable</button>;
      }))}
    </div>
  </div>;
}
