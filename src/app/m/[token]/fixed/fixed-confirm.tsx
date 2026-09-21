"use client";

import { useEffect, useState } from "react";

const JAK = "var(--font-jak), system-ui, sans-serif";
const GRO = "var(--font-gro), system-ui, sans-serif";

// Marks a raised onboarding fix as done when the referrer opens the link from their
// email. The mark happens in a client effect (not on server GET) so email link
// scanners / prefetchers — which don't run JS — don't accidentally mark it fixed.
export default function FixedConfirm({ token, app }: { token: string; app: string }) {
  const [state, setState] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!app) { if (!cancelled) setState("error"); return; }
      try {
        const res = await fetch(`/api/m/${token}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "fixDone", applicationId: app }),
        });
        if (!cancelled) setState(res.ok ? "done" : "error");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => { cancelled = true; };
  }, [token, app]);

  return (
    <main style={{ minHeight: "100dvh", background: "#e9ebef", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 440, background: "#fff", border: "1px solid #e6e8ec", borderRadius: 18, padding: "32px 26px", textAlign: "center", boxShadow: "0 12px 40px rgba(15,23,42,.08)" }}>
        {state === "loading" && (
          <>
            <div style={{ font: `500 14px ${JAK}`, color: "#7b8696" }}>Saving…</div>
          </>
        )}
        {state === "done" && (
          <>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: "#f0faf4", border: "1px solid #c3ebd2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", font: "700 26px system-ui", color: "#15803d" }}>✓</div>
            <h1 style={{ font: `700 20px ${GRO}`, color: "#0b1220", margin: "0 0 8px" }}>Thanks — marked as fixed</h1>
            <p style={{ font: `500 13.5px/1.55 ${JAK}`, color: "#5b6779", margin: 0 }}>
              We&apos;ve let the LinkedVelocity team know, and they&apos;ll re-check the account shortly. You don&apos;t need to do anything else.
            </p>
            <a href={`/m/${token}`} style={{ display: "inline-block", marginTop: 20, font: `700 13px ${JAK}`, color: "#fff", background: "#0b1220", padding: "11px 20px", borderRadius: 11, textDecoration: "none" }}>Go to your portal</a>
          </>
        )}
        {state === "error" && (
          <>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: "#fdf0f0", border: "1px solid #f5c2c2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", font: "700 26px system-ui", color: "#b91c1c" }}>!</div>
            <h1 style={{ font: `700 20px ${GRO}`, color: "#0b1220", margin: "0 0 8px" }}>Couldn&apos;t mark it just now</h1>
            <p style={{ font: `500 13.5px/1.55 ${JAK}`, color: "#5b6779", margin: 0 }}>
              This link may have expired or already been used. Open your portal and tap &quot;I&apos;ve fixed it&quot; there, or just reply to our email and we&apos;ll re-check it.
            </p>
            <a href={`/m/${token}`} style={{ display: "inline-block", marginTop: 20, font: `700 13px ${JAK}`, color: "#fff", background: "#0b1220", padding: "11px 20px", borderRadius: 11, textDecoration: "none" }}>Open your portal</a>
          </>
        )}
      </div>
    </main>
  );
}
