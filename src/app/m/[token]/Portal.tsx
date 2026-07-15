"use client";

import { useEffect, useState } from "react";

interface BoardRow { name: string; signups: number; converted: number; isMe: boolean; }
interface Activity { kind: string; name: string; referrer: string | null; mine: boolean; date: string; }
interface Data {
  me: { name: string; contactMethod: string | null; contactHandle: string | null; paymentMethod: string | null; paymentDetails: string | null; assignedDay: string | null; assignedLocation: string | null; };
  stats: { signups: number; converted: number; commission: number; rate: number; };
  board: BoardRow[];
  activity: Activity[];
}

const peso = (n: number) => "₱" + n.toLocaleString("en-US");
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const STEPS = [
  "Pitch it in one line — they earn passive income each month just by lending us their LinkedIn.",
  "Check they qualify: 17 or older, and their account is older than a week.",
  "They scan your QR code.",
  "They fill in their details — they can skip the valuation.",
  "Done — our team handles onboarding, setup and payment afterwards.",
];
const OFFER: { w: string; a: string; d: string }[] = [
  { w: "Set-up", a: "₱1,000", d: "to their bank, ~3 days after setup" },
  { w: "Monthly", a: "₱500", d: "on the 1st of every month" },
  { w: "Referral", a: "₱500", d: "for anyone they refer who signs up" },
];
const ELIGIBILITY = ["17 years or older (students welcome)", "LinkedIn account older than 1 week", "They own the account and can access its email"];
const DOS = ["Be friendly, casual and quick", "Get them to complete the form", "Be honest that payment comes after setup", "Check age (17+) and account age (>1 week)"];
const DONTS = ["Promise cash on the spot", "Collect passwords, PINs or 2FA codes", "Guarantee earnings beyond the offer", "Sign up under-17s or brand-new accounts"];

const FAQ: { q: string; a: string }[] = [
  { q: "When do I get paid?", a: "You get ₱2,000 for the day, plus ₱500 for every sign-up that gets accepted onto our inventory. Commissions release about 3 days after a sign-up is accepted and are paid the following Monday." },
  { q: "Is it safe for them? Can you steal their account?", a: "No. They keep recovery access to their own account at all times and can take it back whenever they want. It's used for professional outreach only." },
  { q: "Do they get paid today?", a: "No — after they're onboarded online, we wait a few days to be sure the account is stable, then send ₱1,000 to their bank. After that, ₱500 lands on the 1st of every month." },
  { q: "What if someone doesn't qualify?", a: "Just thank them and move on — only 17+ with an account older than a week qualifies." },
  { q: "Can they sign up friends or family?", a: "Yes — anyone 17+ with an account older than a week. Each account earns its own bonus and monthly payout, and you get credit for the referral." },
  { q: "What if they want their account back later?", a: "No problem — they can reclaim it anytime, and the monthly payments simply stop." },
];

export default function Portal({ token }: { token: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "notfound">("loading");
  const [form, setForm] = useState({ contactMethod: "whatsapp", contactHandle: "", paymentMethod: "GCash", paymentDetails: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/m/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Data) => {
        setData(d);
        setForm({
          contactMethod: d.me.contactMethod || "whatsapp",
          contactHandle: d.me.contactHandle || "",
          paymentMethod: d.me.paymentMethod || "GCash",
          paymentDetails: d.me.paymentDetails || "",
        });
        setState("ok");
      })
      .catch(() => setState("notfound"));
  }, [token]);

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      await fetch(`/api/m/${token}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setSaved(true); setTimeout(() => setSaved(false), 2200);
    } finally { setSaving(false); }
  };

  const C = {
    bg: "#f3f5f8", card: "#ffffff", line: "#e6e9ef", ink: "#0f1729", muted: "#647189",
    brand: "#00a150", brandDk: "#0b6b3a", accent: "#2563eb", soft: "#eafaf0", warn: "#b45309",
  };
  const wrap: React.CSSProperties = { minHeight: "100vh", background: C.bg, padding: "20px 14px 60px", fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", color: C.ink };
  const inner: React.CSSProperties = { maxWidth: 560, margin: "0 auto" };
  const card: React.CSSProperties = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18, marginTop: 14 };
  const h2: React.CSSProperties = { font: "700 13px system-ui", textTransform: "uppercase", letterSpacing: ".05em", color: C.muted, margin: "0 0 12px" };
  const inp: React.CSSProperties = { width: "100%", border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 12px", font: "500 15px system-ui", color: C.ink, outline: "none", background: "#fff" };
  const lbl: React.CSSProperties = { font: "600 12px system-ui", color: C.muted, display: "block", marginBottom: 6 };

  const sub: React.CSSProperties = { font: "700 13px system-ui", color: C.ink, margin: "4px 0 10px" };

  if (state === "loading") return <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>Loading…</div>;
  if (state === "notfound" || !data) return (
    <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...card, textAlign: "center", maxWidth: 380 }}>
        <div style={{ font: "700 18px system-ui", marginBottom: 8 }}>Link not found</div>
        <div style={{ color: C.muted, fontSize: 14 }}>This dashboard link isn&apos;t valid. Ask your LinkedVelocity contact for your correct link.</div>
      </div>
    </div>
  );

  const { me, stats, board, activity } = data;
  const myRank = board.findIndex((b) => b.isMe) + 1;

  return (
    <div style={wrap}>
      <div style={inner}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: `linear-gradient(135deg,${C.accent},${C.brand})` }} />
          <span style={{ font: "800 15px system-ui" }}>LinkedVelocity</span>
          <span style={{ font: "700 9px system-ui", letterSpacing: ".08em", color: C.muted, border: `1px solid ${C.line}`, padding: "2px 6px", borderRadius: 5 }}>AMBASSADORS</span>
        </div>
        <h1 style={{ font: "800 24px system-ui", margin: "10px 0 2px" }}>Hi, {me.name.split(" ")[0]} 👋</h1>
        <p style={{ color: C.muted, margin: 0, fontSize: 14 }}>
          {me.assignedDay || me.assignedLocation
            ? <>You&apos;re on for <b style={{ color: C.ink }}>{[me.assignedDay, me.assignedLocation].filter(Boolean).join(" · ")}</b>.</>
            : "Here's how your referrals are doing."}
        </p>

        {/* your numbers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 14 }}>
          {[
            { l: "Signups", v: String(stats.signups), c: C.ink },
            { l: "Accepted", v: String(stats.converted), c: C.brand },
            { l: "Est. earned", v: peso(stats.commission), c: C.ink },
          ].map((t) => (
            <div key={t.l} style={{ ...card, marginTop: 0, padding: "16px 12px", textAlign: "center" }}>
              <div style={{ font: "800 22px system-ui", color: t.c }}>{t.v}</div>
              <div style={{ font: "600 11px system-ui", color: C.muted, marginTop: 3 }}>{t.l}</div>
            </div>
          ))}
        </div>

        {/* payout rule */}
        <div style={{ ...card, background: C.soft, borderColor: "#bfe9cf" }}>
          <div style={{ font: "700 14px system-ui", color: C.brandDk, marginBottom: 6 }}>How &amp; when you get paid</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "#1c4e34" }}>
            You earn <b>{peso(stats.rate)}</b> for every signup that gets <b>accepted</b> onto our inventory. Your commission releases about <b>3 days after</b> a signup is accepted, and is paid out the <b>following Monday</b>.
          </div>
          <div style={{ fontSize: 12, color: "#3f7d5a", marginTop: 8 }}>The figure above is an estimate — the exact payable amount is confirmed at payout.</div>
        </div>

        {/* leaderboard */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <h2 style={{ ...h2, margin: 0 }}>Leaderboard</h2>
            {myRank > 0 && <span style={{ font: "700 12px system-ui", color: C.brand }}>You&apos;re #{myRank} of {board.length}</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {board.map((b, i) => (
              <div key={b.name + i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: i === 0 ? "none" : `1px solid ${C.line}`, background: b.isMe ? "rgba(0,161,80,.06)" : "transparent", borderRadius: b.isMe ? 8 : 0, paddingLeft: b.isMe ? 8 : 0, paddingRight: b.isMe ? 8 : 0 }}>
                <span style={{ font: "700 13px system-ui", color: C.muted, width: 22 }}>{i + 1}</span>
                <span style={{ flex: 1, font: b.isMe ? "700 14px system-ui" : "500 14px system-ui", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}{b.isMe ? " (you)" : ""}</span>
                <span style={{ font: "700 15px system-ui", color: C.brand }}>{b.converted}<span style={{ font: "500 11px system-ui", color: C.muted }}> ✓</span></span>
                <span style={{ font: "500 12px system-ui", color: C.muted, width: 62, textAlign: "right" }}>{b.signups} signups</span>
              </div>
            ))}
          </div>
        </div>

        {/* activity */}
        <div style={card}>
          <h2 style={h2}>Recent signups</h2>
          {activity.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>No signups yet — share your QR to get started.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {activity.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, flex: "none", background: a.kind === "converted" ? C.brand : C.accent }} />
                  <span style={{ flex: 1, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.referrer ? <>{a.referrer} → <b>{a.name}</b></> : <>New signup — <b>{a.name}</b></>}
                    {a.mine && <span style={{ font: "700 9px system-ui", color: C.brand, marginLeft: 6, background: C.soft, padding: "1px 5px", borderRadius: 4 }}>YOU</span>}
                  </span>
                  <span style={{ fontSize: 11.5, color: C.muted, flex: "none" }}>{fmtDate(a.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* your details */}
        <div style={card}>
          <h2 style={h2}>Your payout details</h2>
          <p style={{ fontSize: 12.5, color: C.muted, margin: "-4px 0 14px" }}>Keep these up to date so we can pay you.</p>
          <label style={lbl}>Contact</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <select value={form.contactMethod} onChange={(e) => setForm({ ...form, contactMethod: e.target.value })} style={{ ...inp, width: 130 }}>
              <option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option>
            </select>
            <input value={form.contactHandle} onChange={(e) => setForm({ ...form, contactHandle: e.target.value })} placeholder="number / @handle" style={inp} />
          </div>
          <label style={lbl}>Pay me via</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} style={{ ...inp, width: 130 }}>
              <option>GCash</option><option>Maya</option><option>Bank</option>
            </select>
            <input value={form.paymentDetails} onChange={(e) => setForm({ ...form, paymentDetails: e.target.value })} placeholder="account number / details" style={inp} />
          </div>
          <button onClick={save} disabled={saving} style={{ width: "100%", background: saved ? C.brandDk : C.brand, color: "#fff", border: "none", borderRadius: 10, padding: 13, font: "700 15px system-ui", cursor: "pointer" }}>
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save details"}
          </button>
        </div>

        {/* field day guide */}
        <div style={card}>
          <h2 style={h2}>Field day guide</h2>

          <div style={sub}>How a sign-up works</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                <span style={{ flex: "none", width: 24, height: 24, borderRadius: 999, background: C.brand, color: "#fff", font: "700 12px system-ui", display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                <span style={{ fontSize: 13.5, lineHeight: 1.5, color: C.ink, paddingTop: 2 }}>{s}</span>
              </div>
            ))}
          </div>

          <div style={sub}>The offer you share</div>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
            {OFFER.map((o, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}>
                <span style={{ font: "600 13px system-ui", width: 62, flex: "none" }}>{o.w}</span>
                <span style={{ font: "800 15px system-ui", color: C.brand, width: 60, flex: "none" }}>{o.a}</span>
                <span style={{ fontSize: 12.5, color: C.muted }}>{o.d}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12.5, color: C.warn, margin: "8px 0 20px" }}>Payment comes after setup — never cash on the spot.</div>

          <div style={sub}>Who qualifies</div>
          <ul style={{ margin: "0 0 20px", paddingLeft: 18 }}>
            {ELIGIBILITY.map((e, i) => <li key={i} style={{ fontSize: 13.5, lineHeight: 1.6, color: C.ink }}>{e}</li>)}
          </ul>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 13px" }}>
              <div style={{ font: "700 12px system-ui", color: "#15803d", marginBottom: 7 }}>DO</div>
              <ul style={{ margin: 0, paddingLeft: 15 }}>{DOS.map((d, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.5, color: C.ink, marginBottom: 4 }}>{d}</li>)}</ul>
            </div>
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 13px" }}>
              <div style={{ font: "700 12px system-ui", color: "#b91c1c", marginBottom: 7 }}>DON&apos;T</div>
              <ul style={{ margin: 0, paddingLeft: 15 }}>{DONTS.map((d, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.5, color: C.ink, marginBottom: 4 }}>{d}</li>)}</ul>
            </div>
          </div>
        </div>

        {/* faqs */}
        <div style={card}>
          <h2 style={h2}>FAQs</h2>
          {FAQ.map((f, i) => (
            <div key={i} style={{ padding: "13px 0", borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}>
              <div style={{ font: "700 14px system-ui", color: C.ink, marginBottom: 5 }}>{f.q}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: C.muted }}>{f.a}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", color: C.muted, fontSize: 11.5, marginTop: 20 }}>Questions? Message your LinkedVelocity contact.</div>
      </div>
    </div>
  );
}
