"use client";

import { useState } from "react";
import { countries } from "@/lib/countries";
import styles from "./wizard.module.css";
import TotpCode from "./totp";
import { WaitNotice } from "./onboarding-scripts";

type BrowserSession = {
  id: string;
  name: string;
  state: string;
  opened: boolean;
  country: string | null;
  shareLink: string | null;
};

const TITLES = ["Prepare the browser", "Open their GoLogin browser", "Owner signs in to LinkedIn", "Close the browser and save"];
const BUSY_STATES = ["purchasing", "purchase_unknown", "creating", "proxy_pending", "link_pending"];

export default function BrowserStep({ session, busy, action, confirm, refresh, error, twoFactorKey, loginEmail = null, primaryConfirmedAt = null, linkCopied = false, copyLink, onManageEmail, selfMode = false, demo = false }: {
  selfMode?: boolean;
  demo?: boolean;
  session: BrowserSession;
  busy: boolean;
  action: (action: "prepare" | "opened") => Promise<void>;
  confirm: (password: string) => Promise<void>;
  refresh: () => Promise<void>;
  error?: string;
  // Captured in the dedicated 2FA step; shown here as a live code for LinkedIn's prompt.
  twoFactorKey: string;
  loginEmail?: string | null;
  primaryConfirmedAt?: string | null;
  linkCopied?: boolean;
  copyLink?: () => void;
  onManageEmail?: () => void;
}) {
  // The session is keyed on state in the parent, so this remounts (and re-derives the open
  // step) whenever the browser becomes ready or is opened.
  const initialStep = session.state !== "ready" ? 1 : session.opened ? 3 : 2;
  const [miniStep, setMiniStep] = useState(initialStep);
  const [seen, setSeen] = useState(demo);
  const [closed, setClosed] = useState(demo);
  const [password, setPassword] = useState(demo ? "LinkedVel2026!" : "");
  const [showPw, setShowPw] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  const country = countries.find((item) => item.code === session.country)?.name || session.country || "the Philippines";
  const okPw = password.trim().length >= 6;
  const canSave = closed && okPw;
  const their = selfMode ? "your" : "their";

  const dot = (state: "done" | "active" | "locked", label: string) => <span style={{ width: 26, height: 26, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", font: "700 12.5px 'Space Grotesk', system-ui, sans-serif", ...(state === "done" ? { background: "#16a34a", color: "#fff" } : state === "active" ? { background: "#0b1220", color: "#fff" } : { background: "#eef0f3", color: "#8a93a3" }) }}>{label}</span>;
  const line = (done: boolean) => <span style={{ flex: 1, width: 2, background: done ? "#16a34a" : "#e3e6ea", margin: "4px 0" }} />;
  const colL = { display: "flex", flexDirection: "column", alignItems: "center" } as const;
  const body = { font: "500 12.5px/1.45 'Plus Jakarta Sans', system-ui, sans-serif", color: "#5b6779" } as const;
  const chip = (label: string) => <span style={{ font: "700 12px 'Plus Jakarta Sans', system-ui, sans-serif", padding: "5px 11px", borderRadius: 999, background: "#dcfce7", color: "#15803d" }}>{label}</span>;
  const greenBtn = (enabled: boolean) => ({ border: "none", borderRadius: 12, padding: 13, font: "800 14px 'Plus Jakarta Sans', system-ui, sans-serif", color: "#fff", background: enabled ? "#16a34a" : "#86d4a3", cursor: enabled ? "pointer" : "default" } as const);
  const backBtn = (onClick: () => void) => <button type="button" onClick={onClick} style={{ alignSelf: "flex-start", border: "none", background: "none", padding: 0, font: "600 12.5px 'Plus Jakarta Sans', system-ui, sans-serif", color: "#5b6779", cursor: "pointer" }}>← Back</button>;

  const prepStage = ["purchasing", "purchase_unknown", "creating"].includes(session.state) ? 0 : session.state === "proxy_pending" ? 1 : session.state === "link_pending" ? 2 : 0;
  const prepItems = ["Creating the browser profile", `Connecting through ${country}`, `Sharing it to ${their} GoLogin`];

  const stepBody = (n: number) => {
    if (n === 1) {
      const isBusy = BUSY_STATES.includes(session.state);
      return <>
        <div style={body}>We set up a protected browser for <b style={{ color: "#0b1220" }}>{session.name}</b> with a connection in <b style={{ color: "#0b1220" }}>{country}</b>.</div>
        {!isBusy && <button type="button" disabled={busy} style={greenBtn(!busy)} onClick={() => void action("prepare")}>{busy ? "Preparing…" : session.state === "needs_help" ? "Try preparing again →" : "Prepare browser →"}</button>}
        {isBusy && <div style={{ display: "flex", flexDirection: "column", gap: 8, border: "1px solid #e3e6ea", borderRadius: 12, padding: 12 }}>
          <div style={{ font: "700 12.5px 'Plus Jakarta Sans', system-ui, sans-serif", color: "#0b1220" }}>Browser progress</div>
          {prepItems.map((label, k) => <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, font: "500 12.5px 'Plus Jakarta Sans', system-ui, sans-serif", color: k <= prepStage ? "#0b1220" : "#8a93a3" }}><span style={{ flex: "none", width: 16, height: 16, borderRadius: "50%", background: k < prepStage ? "#16a34a" : k === prepStage ? "#86d4a3" : "#e3e6ea", color: "#fff", font: "800 9.5px 'Plus Jakarta Sans', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>{k < prepStage ? "✓" : ""}</span>{label}</div>)}
          <div style={{ font: "500 11.5px/1.45 'Plus Jakarta Sans', system-ui, sans-serif", color: "#8a93a3" }}>Takes about a minute. You can leave this page; we&apos;ll keep going. Reference: {session.id}</div>
          <button type="button" disabled={busy} onClick={() => void refresh()} style={{ alignSelf: "flex-start", border: "none", background: "none", padding: 0, font: "700 12.5px 'Plus Jakarta Sans', system-ui, sans-serif", color: "#15803d", cursor: "pointer" }}>{busy ? "Checking…" : "Check progress"}</button>
        </div>}
      </>;
    }
    if (n === 2) {
      return <>
        <div style={body}>Keep this page open. If your browser asks to open GoLogin, allow it.</div>
        <a href={session.shareLink || "#"} target="_blank" rel="noreferrer" onClick={() => { void action("opened"); setMiniStep(3); }} style={{ textAlign: "center", borderRadius: 12, padding: 13, font: "800 14px 'Plus Jakarta Sans', system-ui, sans-serif", color: "#fff", background: "#16a34a", textDecoration: "none" }}>Open {their} GoLogin browser ↗</a>
        <div style={{ ...body, fontSize: 12 }}>GoLogin not installed? <a href="https://gologin.com/download" target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>Install it here ↗</a>, then come back.</div>
        {backBtn(() => setMiniStep(1))}
      </>;
    }
    if (n === 3) {
      return <>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, ...body }}>
          <span>a. In that browser, go to <b style={{ color: "#0b1220" }}>linkedin.com</b>{loginEmail ? <> and sign in as <b style={{ color: "#0b1220" }}>{loginEmail}</b></> : ""}.</span>
          <span>b. {selfMode ? "Enter your" : "The owner enters their"} password and {selfMode ? "do" : "does"} any check LinkedIn asks for.</span>
          <span>c. If LinkedIn asks for a 2-step code, use this one:</span>
        </div>
        {loginEmail && <button type="button" onClick={() => { navigator.clipboard?.writeText(loginEmail); setEmailCopied(true); setTimeout(() => setEmailCopied(false), 1600); }} style={{ alignSelf: "flex-start", border: "1px solid #d9dde3", background: "#fff", borderRadius: 10, padding: "7px 11px", font: "700 12px 'Plus Jakarta Sans', system-ui, sans-serif", color: "#0b1220", cursor: "pointer" }}>{emailCopied ? "Login email copied ✓" : "Copy login email"}</button>}
        {twoFactorKey.trim() ? <TotpCode secretKey={twoFactorKey.trim()} /> : <div style={{ ...body, fontSize: 12 }}>No 2-step code saved — {selfMode ? "you’ll" : "the owner will"} approve the sign-in on their phone instead.</div>}
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", font: "600 13px/1.45 'Plus Jakarta Sans', system-ui, sans-serif", color: "#0b1220", cursor: "pointer" }}><input type="checkbox" checked={seen} onChange={(e) => setSeen(e.target.checked)} style={{ width: 18, height: 18, margin: "1px 0 0", accentColor: "#16a34a", flex: "none" }} />I can see {selfMode ? "my" : "their"} LinkedIn feed and profile</label>
        <button type="button" disabled={!seen} style={greenBtn(seen)} onClick={() => seen && setMiniStep(4)}>Continue →</button>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>{backBtn(() => setMiniStep(2))}<a href={session.shareLink || "#"} target="_blank" rel="noreferrer" style={{ font: "600 12.5px 'Plus Jakarta Sans', system-ui, sans-serif" }}>Reopen browser ↗</a></div>
      </>;
    }
    return <>
      <div style={body}>Close the GoLogin browser normally and wait a few seconds while it saves. Keep this page open.</div>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", font: "600 13px/1.45 'Plus Jakarta Sans', system-ui, sans-serif", color: "#0b1220", cursor: "pointer" }}><input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} style={{ width: 18, height: 18, margin: "1px 0 0", accentColor: "#16a34a", flex: "none" }} />I closed the GoLogin browser</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ font: "600 13px 'Plus Jakarta Sans', system-ui, sans-serif", color: "#0b1220" }}>{selfMode ? "Your" : "Owner’s"} LinkedIn password</span>
        <div style={{ position: "relative" }}>
          <input type={showPw ? "text" : "password"} autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="e.g. LinkedVel2026!" style={{ width: "100%", boxSizing: "border-box", border: `1.5px solid ${okPw ? "#86efac" : "#d9dde3"}`, borderRadius: 12, padding: "13px 60px 13px 13px", font: "600 15px 'Plus Jakarta Sans', system-ui, sans-serif", color: "#0b1220", outline: "none", background: "#fff" }} />
          <button type="button" onClick={() => setShowPw((v) => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", font: "700 12px 'Plus Jakarta Sans', system-ui, sans-serif", color: "#5b6779", cursor: "pointer" }}>{showPw ? "Hide" : "Show"}</button>
        </div>
        <span style={{ font: "500 12px/1.45 'Plus Jakarta Sans', system-ui, sans-serif", color: "#8a93a3" }}>So we can recover the account if LinkedIn logs it out. {selfMode ? "You keep" : "The owner keeps"} full access.</span>
      </div>
      <button type="button" disabled={busy || !canSave} style={greenBtn(!busy && canSave)} onClick={() => void confirm(password.trim())}>{busy ? "Saving…" : "Confirm sign-in ✓"}</button>
      {backBtn(() => setMiniStep(3))}
    </>;
  };

  return <>
    <div className={styles.stepLabel} style={{ color: "#15803d" }}>Computer sign-in</div>
    <h1 className={styles.heroTitle}>{selfMode ? "Sign in to your account" : "Sign in with the owner"}</h1>
    <p className={styles.lead}>About 10 minutes on a Windows or Mac computer{selfMode ? "" : ", with the owner next to you"}.</p>
    {error && <div className={styles.error} role="alert">{error}</div>}

    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "2px 0 2px" }}>{chip("✓ Email is ours")}{chip("✓ 2FA set")}</div>

    {copyLink && <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#f8f9fb", borderRadius: 12, padding: "10px 12px" }}>
      <span style={{ flex: 1, font: "500 12.5px/1.45 'Plus Jakarta Sans', system-ui, sans-serif", color: "#3b4556" }}><b style={{ color: "#0b1220" }}>On your phone?</b> Open this page on the computer instead.</span>
      <button type="button" onClick={copyLink} style={{ flex: "none", border: "1px solid #d9dde3", background: "#fff", borderRadius: 10, padding: "8px 12px", font: "700 12.5px 'Plus Jakarta Sans', system-ui, sans-serif", color: "#0b1220", cursor: "pointer" }}>{linkCopied ? "Copied ✓" : "Copy link"}</button>
    </div>}

    <WaitNotice primaryConfirmedAt={primaryConfirmedAt} />

    <div style={{ display: "flex", flexDirection: "column", marginTop: 4 }}>
      {TITLES.map((title, i) => {
        const n = i + 1;
        const state: "done" | "active" | "locked" = n < miniStep ? "done" : n === miniStep ? "active" : "locked";
        return <div key={title} style={{ display: "flex", gap: 12 }}>
          <div style={colL}>{dot(state, state === "done" ? "✓" : String(n))}{n < 4 && line(state === "done")}</div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 9, padding: "2px 0 18px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ font: "600 14.5px/1.45 'Plus Jakarta Sans', system-ui, sans-serif", color: state === "locked" ? "#8a93a3" : "#0b1220" }}>{title}</span>
              {state === "done" && <span style={{ font: "600 12px 'Plus Jakarta Sans', system-ui, sans-serif", color: "#16a34a" }}>Done</span>}
            </div>
            {state === "active" && stepBody(n)}
          </div>
        </div>;
      })}
    </div>

    <p style={{ font: "500 12px/1.5 'Plus Jakarta Sans', system-ui, sans-serif", color: "#8a93a3", textAlign: "center", marginTop: 2 }}>
      LinkedIn blocked the sign-in? Stop here — your progress is saved. <a href="mailto:info@linkedvelocity.com" style={{ fontWeight: 700 }}>Message the team</a>
      {onManageEmail && <> · <button type="button" onClick={onManageEmail} style={{ border: "none", background: "none", padding: 0, font: "700 12px 'Plus Jakarta Sans', system-ui, sans-serif", color: "#15803d", cursor: "pointer" }}>Manage onboarding email</button></>}
    </p>
  </>;
}
