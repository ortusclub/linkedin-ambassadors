"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Interactive 2FA setup guide — ported from the design. Role-aware (owner vs referrer),
// progress + done tracking (localStorage), and a built-in TOTP code generator that runs
// entirely in the browser. Unlisted/noindex is set on the server page.

const IMG = "/images/guide/2fa/";
const JAK = "'Plus Jakarta Sans',system-ui,sans-serif";
const GRO = "'Space Grotesk',system-ui,sans-serif";

type Img = [string, string];
interface StepDef {
  part: number; title: string; body: string; imgs: Img[];
  example?: boolean; warnTitle?: string; warn?: string; isCode?: boolean;
  ref?: Partial<StepDef>;
}

const STEPS: StepDef[] = [
  { part: 0, title: "Open Settings", body: "On a computer, click your photo (Me) at the top right, then Settings & Privacy. In the LinkedIn app, tap your photo at the top left, then Settings. Screenshots show the computer view — the app uses the same names.", imgs: [["step-1.png", "The Me menu with Settings & Privacy"]] },
  { part: 0, title: "Go to Sign in & security", body: "In the left-hand menu, click Sign in & security.", imgs: [["step-2.png", "Settings left menu"]] },
  { part: 0, title: "Open Two-factor authentication", body: "Under Account access, click Two-factor authentication. It should say Off.", imgs: [["step-3.png", "Two-factor authentication Off"]] },
  { part: 0, title: "Click Set up", body: "Click the blue Set up button.", imgs: [["step-4.png", "Set up button"]] },
  { part: 1, title: "Enter the emailed code", body: "LinkedIn emails a 6-digit code to the account’s email. Open that inbox, enter the code, and click Submit.", imgs: [["step-5.png", "Enter the emailed code"]] },
  { part: 1, title: "Choose Authenticator App", body: "Select Authenticator App (not phone number), then Continue.", imgs: [["step-6.png", "Authenticator App selected"]] },
  { part: 1, title: "Enter the password", body: "Type the LinkedIn password and click Submit.", imgs: [["step-7.png", "Enter Password prompt"]] },
  {
    part: 2, title: "Copy the setup key", body: "Under the QR code is a setup key — a long string of letters and numbers. Click the copy icon next to it. In the app, tap “Can’t scan the QR code?” to reveal it. You don’t need to scan the QR.", imgs: [["step-8.png", "Authenticator setup screen"]],
    example: true,
    warnTitle: "Send it to whoever is onboarding you", warn: "That’s your referrer, or the LinkedVelocity team if you signed up directly. Send it now in the same chat — without it we can’t keep the account signed in, and LinkedIn won’t show it again.",
    ref: { warnTitle: "Paste it into your portal now", warn: "Put it in “The 2FA setup key” field on this owner’s onboarding. That’s how it’s recorded against the account — without it we can’t sign in. LinkedIn won’t show the key again." },
  },
  {
    part: 2, title: "Get the 6-digit code", body: "Paste the key below to get the code LinkedIn is asking for. It refreshes every 30 seconds — if it’s about to change, wait for the next one.", imgs: [], isCode: true,
    ref: { title: "Get the 6-digit code from your portal", body: "Once the key is in “The 2FA setup key” field, the portal shows the live 6-digit code. Copy it. It refreshes every 30 seconds — if it’s about to change, wait for the next one.", imgs: [["step-9-portal.png", "2FA field in the LinkedVelocity portal"]] },
  },
  { part: 2, title: "Enter the code on LinkedIn", body: "Back on LinkedIn, paste the 6-digit code and click Confirm.", imgs: [["step-10.png", "Enter code and Confirm"]] },
  { part: 2, title: "Check it says On", body: "Two-factor authentication now shows On. That’s it.", imgs: [["step-11.png", "Two-factor authentication On"]] },
];
const PARTS = [
  { title: "Find the setting", sub: "Steps 1–4 · about 30 seconds" },
  { title: "Prove it’s you", sub: "Steps 5–7 · needs inbox + password" },
  { title: "Link the authenticator", sub: "Steps 8–11 · the important part" },
];
const NEEDS = [
  { title: "Your phone or a computer", sub: "Works in the LinkedIn app or on linkedin.com." },
  { title: "The LinkedIn password", sub: "Asked for at step 7." },
  { title: "The account’s email inbox", sub: "A 6-digit code arrives there at step 5." },
  { title: "A chat with whoever is onboarding you", sub: "Your referrer or the LinkedVelocity team — you’ll send them the setup key at step 8." },
];
const NEEDS_REF = { title: "Your LinkedVelocity portal open", sub: "On this owner’s onboarding — you’ll paste the setup key at step 8." };
const FAQS = [
  { q: "LinkedIn says the code is wrong", a: "Codes expire every 30 seconds. Wait for a fresh one and paste it straight away. If it keeps failing, check your computer’s clock is set to automatic — a clock that’s off by a minute breaks every code." },
  { q: "The email code never arrived", a: "Check spam and promotions, and make sure you’re in the inbox that’s on the LinkedIn account. Wait a minute, then use Resend. Each new code replaces the old one." },
  { q: "Two-factor authentication already says On", a: "Don’t turn it off. Message your contact — if you still have the original setup key we can use that; otherwise we’ll guide you through a reset." },
  { q: "I closed the page before saving the key", a: "If 2FA isn’t On yet, just start again from step 4 — you’ll get a new key. If it’s already On without a saved key, turn 2FA off, then set it up again and save the new key." },
  { q: "It only offers a phone number", a: "Look for the method dropdown at step 6 and switch it to Authenticator App. Don’t use SMS — we can’t keep the account signed in with it." },
];

function b32(s: string): Uint8Array {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  s = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = ""; const out: number[] = [];
  for (const c of s) bits += a.indexOf(c).toString(2).padStart(5, "0");
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return new Uint8Array(out);
}
async function totp(key: string, step: number): Promise<string | null> {
  const k = b32(key);
  if (k.length < 10) return null;
  const buf = new ArrayBuffer(8);
  new DataView(buf).setUint32(4, step);
  const ck = await crypto.subtle.importKey("raw", k as unknown as ArrayBuffer, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const h = new Uint8Array(await crypto.subtle.sign("HMAC", ck, buf));
  const o = h[19] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1e6).padStart(6, "0");
}

export default function Guide2FA() {
  const [done, setDone] = useState<number[]>([]);
  const [role, setRole] = useState<"owner" | "referrer">("owner");
  const [key, setKey] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [left, setLeft] = useState(30);
  const [faq, setFaq] = useState(-1);
  const [copied, setCopied] = useState(false);
  const [gen, setGen] = useState(false);
  const keyRef = useRef("");
  keyRef.current = key;

  // Load persisted state on mount (client only, avoids SSR mismatch).
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem("lv2fa_done") || "[]");
      if (Array.isArray(d)) setDone(d);
      const r = new URLSearchParams(location.search).get("for") || localStorage.getItem("lv2fa_role");
      if (r === "referrer" || r === "owner") setRole(r);
    } catch { /* storage blocked */ }
  }, []);

  // 1s tick: countdown + recompute the live code from the pasted key.
  useEffect(() => {
    let active = true;
    const tick = async () => {
      const now = Date.now() / 1000;
      if (active) setLeft(30 - Math.floor(now % 30));
      const k = keyRef.current;
      if (k) { try { const c = await totp(k, Math.floor(now / 30)); if (active) setCode(c); } catch { if (active) setCode(null); } }
      else if (active) setCode(null);
    };
    void tick();
    const id = setInterval(() => void tick(), 1000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const save = useCallback((d: number[]) => { try { localStorage.setItem("lv2fa_done", JSON.stringify(d)); } catch {} setDone(d); }, []);
  const isRef = role === "referrer";

  const toggleDone = (i: number) => {
    const adding = !done.includes(i);
    const d = adding ? [...done, i] : done.filter((x) => x !== i);
    save(d);
    if (adding) {
      const nx = STEPS.findIndex((_, j) => !d.includes(j));
      const el = nx >= 0 && document.getElementById("step-" + (nx + 1));
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: "smooth" });
    }
  };
  const reset = () => { save([]); setKey(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const setRoleP = (r: "owner" | "referrer") => { try { localStorage.setItem("lv2fa_role", r); } catch {} setRole(r); };

  const cur = STEPS.findIndex((_, i) => !done.includes(i));
  const allDone = done.length === STEPS.length;
  const valid = !!(key && code);
  const timerFg = left <= 5 ? "#fbbf24" : "#6ee7b7";
  const needs = useMemo(() => (isRef ? [...NEEDS.slice(0, 3), NEEDS_REF] : NEEDS), [isRef]);

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e6e8ec", borderRadius: 16, padding: 20 };
  const pill: React.CSSProperties = { font: `600 12px ${JAK}`, color: "#0b1220", background: "#fff", border: "1px solid #e6e8ec", borderRadius: 999, padding: "6px 12px" };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6f8", color: "#0b1220", fontFamily: JAK }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />

      {/* sticky progress bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "#0b1220" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ font: `700 13px ${JAK}`, color: "#fff" }}>Two-step verification</span>
          <span style={{ font: `600 12px ${JAK}`, color: "#6ee7b7" }}>{allDone ? "All done" : `Step ${cur + 1} of ${STEPS.length}`}</span>
          <div style={{ flex: 1, minWidth: 160, display: "flex", gap: 3 }}>
            {STEPS.map((_, i) => (
              <a key={i} href={"#step-" + (i + 1)} style={{ flex: 1, height: 5, borderRadius: 3, background: done.includes(i) ? "#22c55e" : i === cur ? "#6ee7b7" : "#26324a" }} />
            ))}
          </div>
          <button onClick={reset} style={{ font: `600 11.5px ${JAK}`, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>Start over</button>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 20px 80px" }}>
        {/* header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 28, alignItems: "start", marginBottom: 36 }}>
          <div>
            <div style={{ font: `700 11px ${JAK}`, letterSpacing: ".09em", textTransform: "uppercase", color: "#15803d", marginBottom: 10 }}>Setup guide</div>
            <h1 style={{ font: `600 38px/1.08 ${GRO}`, letterSpacing: "-.025em", margin: "0 0 14px", textWrap: "balance" }}>Turn on two-step verification</h1>
            <p style={{ font: `500 15px/1.6 ${JAK}`, color: "#5b6779", margin: "0 0 18px" }}>This links an authenticator to the LinkedIn account so LinkedVelocity can keep it signed in safely. The password doesn&apos;t change and the owner keeps full access.</p>
            <div style={{ marginBottom: 18 }}>
              <div style={{ font: `700 12px ${JAK}`, color: "#0b1220", marginBottom: 8 }}>Who&apos;s doing this?</div>
              <div style={{ display: "inline-flex", gap: 3, background: "#e6e8ec", borderRadius: 11, padding: 3, flexWrap: "wrap" }}>
                <button onClick={() => setRoleP("owner")} style={{ font: `700 13px ${JAK}`, color: isRef ? "#5b6779" : "#0b1220", background: isRef ? "transparent" : "#fff", boxShadow: isRef ? "none" : "0 1px 2px rgba(11,18,32,.12)", border: "none", borderRadius: 8, padding: "9px 14px", cursor: "pointer" }}>I&apos;m the account owner</button>
                <button onClick={() => setRoleP("referrer")} style={{ font: `700 13px ${JAK}`, color: isRef ? "#0b1220" : "#5b6779", background: isRef ? "#fff" : "transparent", boxShadow: isRef ? "0 1px 2px rgba(11,18,32,.12)" : "none", border: "none", borderRadius: 8, padding: "9px 14px", cursor: "pointer" }}>I&apos;m a referrer helping an owner</button>
              </div>
              <div style={{ font: `500 12.5px/1.5 ${JAK}`, color: "#5b6779", marginTop: 8, maxWidth: 460 }}>{isRef ? "You’re doing this with the owner. The key goes in your portal so it’s recorded against their account." : "You’re setting this up on your own account. At the end you’ll send one key to whoever is onboarding you."}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={pill}>About 3 minutes</span>
              <span style={pill}>Phone or computer</span>
              <span style={pill}>11 steps · 3 parts</span>
            </div>
          </div>
          <div style={card}>
            <div style={{ font: `700 14px ${JAK}`, marginBottom: 4 }}>Have these ready</div>
            <p style={{ font: `500 12.5px ${JAK}`, color: "#7b8696", margin: "0 0 10px" }}>LinkedIn asks for each of them partway through.</p>
            {needs.map((n, i) => (
              <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid #f1f3f6" }}>
                <span style={{ width: 20, height: 20, borderRadius: 999, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", font: `700 10px ${JAK}`, background: "#f0faf4", color: "#15803d", marginTop: 1 }}>{i + 1}</span>
                <div><div style={{ font: `600 13px ${JAK}` }}>{n.title}</div><div style={{ font: `500 12px/1.45 ${JAK}`, color: "#7b8696", marginTop: 2 }}>{n.sub}</div></div>
              </div>
            ))}
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "11px 13px", marginTop: 8, font: `500 12px/1.5 ${JAK}`, color: "#9a3412" }}>Already says <strong>On</strong> at step 3? Stop and message your contact — we&apos;ll need the existing key or a reset.</div>
          </div>
        </div>

        {/* parts + steps */}
        {PARTS.map((p, pi) => (
          <div key={pi} style={{ marginBottom: 34 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, paddingBottom: 12, marginBottom: 14, borderBottom: "1px solid #e1e4ea", flexWrap: "wrap" }}>
              <span style={{ font: `600 13px ${GRO}`, color: "#15803d" }}>Part {pi + 1}</span>
              <h2 style={{ font: `600 22px ${GRO}`, letterSpacing: "-.015em", margin: 0 }}>{p.title}</h2>
              <span style={{ font: `500 12.5px ${JAK}`, color: "#7b8696" }}>{p.sub}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {STEPS.map((s0, i) => s0.part !== pi ? null : (() => {
                const s = isRef && s0.ref ? { ...s0, ...s0.ref } : s0;
                const d = done.includes(i), c = i === cur;
                const showGen = !!s0.isCode && (!isRef || gen);
                return (
                  <div key={i} id={"step-" + (i + 1)} style={{ background: "#fff", border: c ? "2px solid #15803d" : "1px solid #e6e8ec", borderRadius: 16, padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 22, alignItems: "start", opacity: d ? 0.62 : 1, scrollMarginTop: 70 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <span style={{ width: 30, height: 30, borderRadius: 999, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", font: `700 13px ${GRO}`, background: d ? "#15803d" : c ? "#0b1220" : "#eef0f3", color: d || c ? "#fff" : "#5b6779" }}>{d ? "✓" : i + 1}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 style={{ font: `700 16px ${JAK}`, margin: "4px 0 6px" }}>{s.title}</h3>
                        <p style={{ font: `500 14px/1.6 ${JAK}`, color: "#3d4757", margin: 0 }}>{s.body}</p>

                        {s0.example && (<>
                          <div style={{ marginTop: 14, border: "1px solid #bbf7d0", background: "#f0faf4", borderRadius: 12, padding: 14 }}>
                            <div style={{ font: `700 11px ${JAK}`, letterSpacing: ".08em", textTransform: "uppercase", color: "#15803d", marginBottom: 8 }}>The key looks like this</div>
                            <div style={{ font: `600 15px/1.5 ${GRO}`, letterSpacing: ".06em", color: "#0b1220", background: "#fff", border: "1px dashed #86efac", borderRadius: 8, padding: "10px 12px", wordBreak: "break-all" }}>K7QX M2VD 4HJN P3WL R6TZ Y8BC E5GS A2FU</div>
                            <div style={{ font: `500 12px/1.5 ${JAK}`, color: "#166534", marginTop: 8 }}>About 32 letters and numbers (A–Z, 2–7), sometimes in groups of four. Send the whole thing — spaces don&apos;t matter.</div>
                          </div>
                          <div style={{ marginTop: 8, border: "1px solid #fecaca", background: "#fef2f2", borderRadius: 12, padding: 14 }}>
                            <div style={{ font: `700 11px ${JAK}`, letterSpacing: ".08em", textTransform: "uppercase", color: "#b91c1c", marginBottom: 8 }}>Not these</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}><span style={{ font: `600 14px ${GRO}`, letterSpacing: ".08em", color: "#7f1d1d", minWidth: 100 }}>482 913</span><span style={{ font: `500 12px ${JAK}`, color: "#991b1b" }}>A 6-digit code — it expires in 30 seconds</span></div>
                              <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}><span style={{ font: `600 14px ${GRO}`, color: "#7f1d1d", minWidth: 100 }}>QR screenshot</span><span style={{ font: `500 12px ${JAK}`, color: "#991b1b" }}>We need the text under it</span></div>
                              <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}><span style={{ font: `600 14px ${GRO}`, color: "#7f1d1d", minWidth: 100 }}>Password</span><span style={{ font: `500 12px ${JAK}`, color: "#991b1b" }}>Different thing — never send it here</span></div>
                            </div>
                          </div>
                        </>)}

                        {s.warn && (
                          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px 14px", marginTop: 12 }}>
                            <div style={{ font: `700 12.5px ${JAK}`, color: "#9a3412", marginBottom: 3 }}>{s.warnTitle}</div>
                            <div style={{ font: `500 12.5px/1.5 ${JAK}`, color: "#9a3412" }}>{s.warn}</div>
                          </div>
                        )}

                        {s0.isCode && isRef && (
                          <button onClick={() => setGen((g) => !g)} style={{ marginTop: 12, font: `600 12.5px ${JAK}`, color: "#15803d", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>{gen ? "Hide code generator" : "Not using the portal? Get the code here →"}</button>
                        )}
                        {showGen && (<>
                          {isRef && <div style={{ font: `500 12px/1.5 ${JAK}`, color: "#9a3412", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "10px 12px", marginTop: 10 }}>This only shows the code — it doesn&apos;t save the key. Make sure you&apos;ve put the key in the portal (step 8).</div>}
                          <div style={{ background: "#0b1220", borderRadius: 14, padding: 16, marginTop: 10 }}>
                            <div style={{ font: `700 10.5px ${JAK}`, letterSpacing: ".09em", textTransform: "uppercase", color: "#6ee7b7", marginBottom: 9 }}>Code generator</div>
                            <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste setup key, e.g. JBSWY3DPEHPK3PXP" spellCheck={false} autoComplete="off" style={{ width: "100%", font: `600 13px ${GRO}`, letterSpacing: ".04em", color: "#fff", background: "#141d2e", border: "1px solid #26324a", borderRadius: 9, padding: "11px 12px", outline: "none" }} />
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, minHeight: 46 }}>
                              <span style={{ font: `600 32px ${GRO}`, letterSpacing: ".14em", color: valid ? "#fff" : "#5b6779" }}>{valid ? code!.slice(0, 3) + " " + code!.slice(3) : key ? "Key looks incomplete" : "— — —"}</span>
                              {valid && <button onClick={() => { navigator.clipboard?.writeText(code!); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{ font: `700 12px ${JAK}`, color: "#0b1220", background: "#6ee7b7", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}>{copied ? "Copied" : "Copy"}</button>}
                              <span style={{ marginLeft: "auto", font: `600 12px ${JAK}`, color: timerFg }}>{valid ? `${left}s left` : ""}</span>
                            </div>
                            <div style={{ height: 3, background: "#1e293b", borderRadius: 2, marginTop: 8, overflow: "hidden" }}><div style={{ height: "100%", width: (left / 30 * 100) + "%", background: timerFg }} /></div>
                            <div style={{ font: `500 11.5px/1.5 ${JAK}`, color: "#8b97aa", marginTop: 10 }}>Runs in your browser — the key isn&apos;t sent anywhere.</div>
                          </div>
                        </>)}

                        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
                          <button onClick={() => toggleDone(i)} style={{ font: `700 12.5px ${JAK}`, color: d ? "#5b6779" : "#fff", background: d ? "#fff" : "#15803d", border: `1px solid ${d ? "#e6e8ec" : "#15803d"}`, borderRadius: 9, padding: "9px 14px", cursor: "pointer" }}>{d ? "Undo" : "Done — next step"}</button>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                      {s.imgs.map(([f, alt], j) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={j} src={IMG + f} alt={alt} loading="lazy" style={{ width: "100%", display: "block", borderRadius: 10, border: "1px solid #e6e8ec", background: "#f1f3f6" }} />
                      ))}
                    </div>
                  </div>
                );
              })())}
            </div>
          </div>
        ))}

        {allDone && (
          <div style={{ background: "#10261c", borderRadius: 16, padding: 22, marginBottom: 34 }}>
            <div style={{ font: `600 22px ${GRO}`, color: "#fff", marginBottom: 6 }}>2FA is on. You&apos;re done.</div>
            <p style={{ font: `500 13.5px/1.55 ${JAK}`, color: "#a7bcb1", margin: 0 }}>{isRef ? "Make sure the setup key is saved in “The 2FA setup key” field on this owner’s onboarding — that’s what keeps the account signed in." : "Make sure you’ve sent the setup key to whoever is onboarding you — that’s what keeps the account signed in."}</p>
          </div>
        )}

        {/* FAQ */}
        <div style={{ marginBottom: 34 }}>
          <h2 style={{ font: `600 22px ${GRO}`, letterSpacing: "-.015em", margin: "0 0 14px", paddingBottom: 12, borderBottom: "1px solid #e1e4ea" }}>If something goes wrong</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FAQS.map((f, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #e6e8ec", borderRadius: 12 }}>
                <button onClick={() => setFaq(faq === i ? -1 : i)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", padding: "15px 17px", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ font: `600 14px ${JAK}`, color: "#0b1220", flex: 1 }}>{f.q}</span>
                  <span style={{ font: `600 16px ${JAK}`, color: "#7b8696" }}>{faq === i ? "−" : "+"}</span>
                </button>
                {faq === i && <p style={{ font: `500 13.5px/1.6 ${JAK}`, color: "#3d4757", margin: 0, padding: "0 17px 16px" }}>{f.a}</p>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ font: `700 15px ${JAK}`, marginBottom: 3 }}>Still stuck?</div>
            <div style={{ font: `500 13px/1.5 ${JAK}`, color: "#5b6779" }}>Message the person onboarding you and tell them the step number. They&apos;ll walk you through it.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
