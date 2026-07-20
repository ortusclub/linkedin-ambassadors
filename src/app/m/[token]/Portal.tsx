"use client";

import { useEffect, useState } from "react";

interface BoardRow { name: string; signups: number; converted: number; isMe: boolean; }
interface Activity { kind: string; name: string; referrer: string | null; mine: boolean; date: string; }
interface Data {
  me: { name: string; slug: string; contactMethod: string | null; contactHandle: string | null; paymentMethod: string | null; paymentDetails: string | null; assignedDay: string | null; assignedLocation: string | null; };
  stats: { signups: number; converted: number; commission: number; rate: number; };
  board: BoardRow[];
  activity: Activity[];
}

const JAK = "var(--font-jak), system-ui, sans-serif";
const GRO = "var(--font-gro), system-ui, sans-serif";
const peso = (n: number) => "₱" + n.toLocaleString("en-US");
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const STEPS = [
  "Pitch it in one line — they earn passive income each month just by lending us their LinkedIn.",
  "Check they qualify: they're 18 or older. Any LinkedIn account works — brand-new ones just pay out a bit later.",
  "They scan your QR code.",
  "They fill in their details and sign up — that's what records them against your code, so don't stop before this.",
  "Most important: stay with them until they pick a slot on the \"Book your onboarding call\" screen at the end. Don't let them leave on \"I'll do it later\" — they won't.",
  "Done — our team takes it from there on the call, then setup and payment.",
];
const OFFER: { w: string; a: string; d: string }[] = [
  { w: "Set-up", a: "₱1,000", d: "to their bank, ~3 days after setup" },
  { w: "Monthly", a: "₱500", d: "on the 1st of every month" },
];
const DOS = ["Be friendly, casual and quick", "Get them to complete the form", "Watch them book a call slot before they walk away", "Be honest that payment comes after setup", "Check they're 18 or older"];
const DONTS = ["Pressure anyone — encourage, never force", "Promise cash on the spot", "Collect passwords, PINs or 2FA codes", "Guarantee earnings beyond the offer", "Sign up anyone under 18"];

const TIPS = [
  "They can remove their account at any time.",
  "They can view their account any time and see exactly how it's being used.",
  "Their password is never shared with renters — only we have access.",
  "We vet every renter to make sure they're a legitimate business.",
  "They can test it with just one account first to see how it works.",
];

const MARKETER_FAQ = [
  { q: "When do I get paid?", a: "You get ₱2,000 for the day, plus ₱500 for every sign-up accepted onto our inventory. Commissions release about 3 days after a sign-up is accepted and are paid the following Monday." },
  { q: "What counts as a successful sign-up?", a: "The person you signed up gets fully onboarded and their account lands on our inventory — usually confirmed about 3 days after onboarding. That's when your ₱500 is triggered." },
  { q: "What if someone doesn't qualify?", a: "Just thank them and move on — they only need to be 18 or older." },
  { q: "How do I update my payout details?", a: "Right here — scroll down to \"Your payout details\" and save your GCash / bank info so we can pay you." },
  { q: "How do I get invited back?", a: "We track sign-ups per person — strong performers get first pick for the next field days." },
];
const AMBASSADOR_FAQ = [
  { q: "What is LinkedIn?", a: "LinkedIn is like Facebook, but for professionals and businesses — people use it to network, find work, and reach out to potential clients." },
  { q: "Why would a business want to use my account?", a: "LinkedIn limits how many people one account can message or connect with. Businesses need lots of real, established accounts to reach potential clients — so they pay to use accounts like yours." },
  { q: "What will my account be used for?", a: "Two things: sending connection requests and messages to potential clients (outreach), and gathering public professional info like company names and job titles (research). Nothing is ever posted as you." },
  { q: "Is this a scam or illegal?", a: "No — it's completely legal. It's your account and your choice to share access. It does go against LinkedIn's own rules, but that isn't the same as illegal, and everything is consent-based. We only work with vetted, legitimate businesses doing normal professional outreach." },
  { q: "Is it safe? Can you steal my account?", a: "No. You keep recovery access to your own account at all times and can take it back whenever you want. It's used for professional outreach only." },
  { q: "Will you change anything on my profile?", a: "Your name and profile photo stay exactly as they are — we never change those. We may update other details, like your job title, location, or headline / About, to make the profile look credible for professional outreach. It's still your profile." },
  { q: "How much will I earn?", a: "₱1,000 to start — paid to your bank about 3 days after setup (or a week if it's a brand-new account). Then ₱500 every full month your account stays active, paid on the 1st. Your monthly payments start on the 1st of your first full month; the ₱1,000 covers your first partial month, so you're never short-changed." },
  { q: "Can I use a brand-new LinkedIn account?", a: "Yes — new accounts are welcome. It just needs to be about a week old before we pay the setup fee." },
  { q: "Can I still use my account?", a: "Yes. You keep full access, you can see exactly how it's being used, and you can use it yourself any time it isn't being rented." },
  { q: "Do I have to share my password?", a: "Your password is never shared with the renter — they only access the account through our software. We keep it secure so we can quickly sort out any issue with your account for you." },
  { q: "Can my friends or family do it too?", a: "Yes — anyone 18 or older. Each account earns its own set-up bonus and monthly payout." },
  { q: "What if I want my account back later?", a: "No problem — reclaim it anytime, and the monthly payments simply stop." },
];

const C = {
  pageBg: "#eef0f3", appBg: "#f4f6f8", card: "#fff", line: "#ebedf1", line2: "#f0f1f4",
  ink: "#0f1729", slate: "#334155", muted: "#647189", muted2: "#9aa3b2",
  green: "#16a34a", greenDk: "#15803d", softGreen: "#effaf3", softGreenBorder: "#c3ebd2",
  warn: "#c2410c", blue: "#3b82f6", accBg: "#dcf5e4", accFg: "#15803d", pendBg: "#eef1f5", pendFg: "#647189",
  inputBg: "#f7f8fa", inputBorder: "#e3e6ea",
};

export default function Portal({ token }: { token: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "notfound">("loading");
  const [form, setForm] = useState({ contactMethod: "WhatsApp", contactHandle: "", paymentMethod: "GCash", paymentDetails: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [faqOpen, setFaqOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/m/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Data) => {
        setData(d);
        setForm({
          contactMethod: d.me.contactMethod || "WhatsApp",
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
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };
  const toggleFaq = (k: string) => setFaqOpen((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const outer: React.CSSProperties = { minHeight: "100vh", background: C.pageBg, display: "flex", justifyContent: "center", fontFamily: JAK, color: C.ink };

  if (state === "loading") return <div style={{ ...outer, alignItems: "center", color: C.muted }}>Loading…</div>;
  if (state === "notfound" || !data) return (
    <div style={{ ...outer, alignItems: "center", padding: 24 }}>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 24, textAlign: "center", maxWidth: 360 }}>
        <div style={{ font: `700 18px ${GRO}`, marginBottom: 8 }}>Link not found</div>
        <div style={{ color: C.muted, fontSize: 14 }}>This dashboard link isn&apos;t valid. Ask your LinkedVelocity contact for your correct link.</div>
      </div>
    </div>
  );

  const { me, stats, board, activity } = data;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const myLink = `${origin}/r/${me.slug}`;
  const myLinkShort = myLink.replace(/^https?:\/\//, "");
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=0&data=${encodeURIComponent(myLink)}`;
  const ranked = board.slice().sort((a, b) => b.converted - a.converted || b.signups - a.signups);
  const myRank = ranked.findIndex((b) => b.isMe) + 1;
  const copyLink = () => { navigator.clipboard?.writeText(myLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 1500); };

  const card: React.CSSProperties = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "17px 18px", marginBottom: 18 };
  const secLbl: React.CSSProperties = { font: `700 11px ${JAK}`, letterSpacing: ".06em", textTransform: "uppercase", color: C.muted2 };
  const sub: React.CSSProperties = { font: `700 13.5px ${JAK}`, color: C.ink };
  const inp: React.CSSProperties = { flex: 1, minWidth: 0, background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: 10, padding: "11px 13px", font: `500 13.5px ${JAK}`, color: C.ink, outline: "none" };
  const sel: React.CSSProperties = { flex: "none", width: 132, background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: 10, padding: "11px 12px", font: `600 13px ${JAK}`, color: C.ink, cursor: "pointer" };

  const faqBlock = (items: { q: string; a: string }[], prefix: string) => items.map((f, i) => {
    const k = prefix + i, open = faqOpen.has(k);
    return (
      <div key={k} style={{ borderTop: `1px solid ${C.line2}` }}>
        <div onClick={() => toggleFaq(k)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 0", cursor: "pointer", userSelect: "none" }}>
          <span style={{ font: `600 13.5px/1.35 ${JAK}`, color: C.ink }}>{f.q}</span>
          <span style={{ marginLeft: "auto", flex: "none", font: `600 12px ${JAK}`, color: C.muted2, transition: "transform .18s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
        </div>
        {open && <div style={{ padding: "0 0 13px" }}><p style={{ font: `500 13px/1.55 ${JAK}`, color: C.muted, margin: 0 }}>{f.a}</p></div>}
      </div>
    );
  });

  return (
    <div style={outer}>
      <div style={{ width: "100%", maxWidth: 440, background: C.appBg, minHeight: "100vh", position: "relative", paddingBottom: 88 }}>

        {/* top bar */}
        <div style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center", gap: 9, padding: "14px 20px", background: "rgba(244,246,248,.9)", backdropFilter: "blur(10px)", borderBottom: `1px solid #e6e9ee` }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, backgroundImage: "linear-gradient(135deg,#22c55e,#16a34a)" }} />
          <span style={{ font: `700 14px ${JAK}`, color: C.ink }}>LinkedVelocity</span>
          <span style={{ font: `600 9px ${JAK}`, letterSpacing: ".08em", color: C.muted, border: `1px solid #dfe3ea`, padding: "3px 7px", borderRadius: 6 }}>AMBASSADORS</span>
        </div>

        <div style={{ padding: "20px 20px 0" }}>
          {/* hero */}
          <h1 style={{ font: `600 26px/1.1 ${GRO}`, color: C.ink, margin: "6px 0 6px", letterSpacing: "-.02em" }}>Hi, {me.name.split(" ")[0]} 👋</h1>
          <p style={{ font: `500 13.5px/1.5 ${JAK}`, color: C.muted, margin: "0 0 18px" }}>
            {me.assignedDay || me.assignedLocation
              ? <>You&apos;re on for <b style={{ color: C.ink }}>{[me.assignedDay, me.assignedLocation].filter(Boolean).join(" · ")}</b>. Here&apos;s everything you need in the field.</>
              : "Here's how your referrals are doing — and everything you need in the field."}
          </p>

          {/* share hero */}
          <div style={{ backgroundImage: "linear-gradient(160deg,#16a34a,#15803d)", borderRadius: 18, padding: 20, marginBottom: 18, boxShadow: "0 14px 30px -14px rgba(21,128,61,.6)" }}>
            <div style={{ font: `700 11px ${JAK}`, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(255,255,255,.72)", marginBottom: 6 }}>Sign someone up</div>
            <div style={{ font: `600 17px/1.3 ${JAK}`, color: "#fff", marginBottom: 14 }}>Show your QR or share your link — that&apos;s it.</div>
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={() => setQrOpen(true)} style={{ flex: 1, font: `700 14px ${JAK}`, color: C.greenDk, background: "#fff", border: "none", padding: 13, borderRadius: 12, cursor: "pointer" }}>▣ Show QR</button>
              <button onClick={copyLink} style={{ flex: 1, font: `700 14px ${JAK}`, color: "#fff", background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.3)", padding: 13, borderRadius: 12, cursor: "pointer" }}>{linkCopied ? "Copied ✓" : "⧉ Copy link"}</button>
            </div>
            <div style={{ marginTop: 11, font: `500 11.5px ${GRO}`, color: "rgba(255,255,255,.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{myLinkShort}</div>
            <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px solid rgba(255,255,255,.18)", font: `500 12px ${JAK}`, color: "rgba(255,255,255,.82)" }}>Can&apos;t scan? Give them your code: <b style={{ font: `700 13px ${GRO}`, color: "#fff", letterSpacing: ".02em" }}>{me.slug}</b></div>
          </div>

          {/* stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
            {[{ v: String(stats.signups), l: "Signups", c: C.ink }, { v: String(stats.converted), l: "Accepted", c: C.greenDk }, { v: peso(stats.commission), l: "Est. earned", c: C.ink }].map((t) => (
              <div key={t.l} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "15px 10px", textAlign: "center" }}>
                <div style={{ font: `600 24px/1 ${GRO}`, color: t.c, fontVariantNumeric: "tabular-nums" }}>{t.v}</div>
                <div style={{ font: `600 11px ${JAK}`, color: C.muted, marginTop: 5 }}>{t.l}</div>
              </div>
            ))}
          </div>

          {/* how you get paid */}
          <div style={{ background: C.softGreen, border: `1px solid ${C.softGreenBorder}`, borderRadius: 16, padding: "17px 18px", marginBottom: 18 }}>
            <div style={{ font: `700 13.5px ${JAK}`, color: C.greenDk, marginBottom: 8 }}>How &amp; when you get paid</div>
            <p style={{ font: `500 13px/1.55 ${JAK}`, color: "#3f5c4a", margin: "0 0 8px" }}>You earn <b>{peso(stats.rate)}</b> for every signup accepted onto our inventory. It releases <b>~3 days after</b> acceptance and pays out the <b>following Monday</b>.</p>
            <p style={{ font: `500 11.5px/1.5 ${JAK}`, color: "#6b8a77", margin: 0 }}>The figure above is an estimate — the exact payable amount is confirmed at payout.</p>
          </div>

          {/* leaderboard */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={secLbl}>Leaderboard</span>
              {myRank > 0 && <span style={{ font: `700 12px ${JAK}`, color: C.greenDk }}>You&apos;re #{myRank} of {ranked.length}</span>}
            </div>
            {ranked.map((b, i) => (
              <div key={b.name + i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 10px", borderRadius: 10, marginBottom: 4, background: b.isMe ? "#f0faf4" : "transparent" }}>
                <span style={{ font: `600 13px ${GRO}`, color: C.muted2, width: 16, flex: "none" }}>{i + 1}</span>
                <span style={{ font: `${b.isMe ? 700 : 500} 13.5px ${JAK}`, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}{b.isMe ? " (you)" : ""}</span>
                <span style={{ marginLeft: "auto", font: `600 13px ${GRO}`, color: C.greenDk, fontVariantNumeric: "tabular-nums" }}>{b.converted} ✓</span>
                <span style={{ font: `500 12px ${JAK}`, color: C.muted2, whiteSpace: "nowrap", width: 74, textAlign: "right" }}>{b.signups} signups</span>
              </div>
            ))}
            <div style={{ marginTop: 10, paddingTop: 11, borderTop: `1px solid ${C.line2}`, font: `500 12px/1.5 ${JAK}`, color: C.muted }}>Strong performers get first pick for the next field days. 💪</div>
          </div>

          {/* recent signups */}
          <div style={card}>
            <div style={{ ...secLbl, marginBottom: 6 }}>Your recent signups</div>
            {activity.length === 0 ? (
              <div style={{ color: C.muted, fontSize: 13, paddingTop: 4 }}>No signups yet — show your QR to get started.</div>
            ) : activity.map((a, i) => {
              const accepted = a.kind === "converted";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.line2}` }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, flex: "none", background: accepted ? C.green : C.blue }} />
                  <span style={{ font: `500 13px ${JAK}`, color: C.slate, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.referrer ? `${a.referrer} → ${a.name}` : `New signup — ${a.name}`}</span>
                  <span style={{ font: `600 9.5px ${JAK}`, padding: "2px 7px", borderRadius: 5, whiteSpace: "nowrap", flex: "none", background: accepted ? C.accBg : C.pendBg, color: accepted ? C.accFg : C.pendFg }}>{accepted ? "Accepted" : "Pending"}</span>
                  <span style={{ marginLeft: "auto", font: `500 12px ${JAK}`, color: C.muted2, whiteSpace: "nowrap" }}>{fmtDate(a.date)}</span>
                </div>
              );
            })}
          </div>

          {/* field day guide */}
          <div style={card}>
            <div style={{ ...secLbl, marginBottom: 14 }}>Field day guide</div>
            <div style={{ ...sub, marginBottom: 12 }}>How a sign-up works</div>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 11, marginBottom: 11 }}>
                <span style={{ width: 22, height: 22, borderRadius: 999, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", font: `700 11px ${GRO}`, background: C.green, color: "#fff" }}>{i + 1}</span>
                <span style={{ font: `500 13px/1.45 ${JAK}`, color: C.slate }}>{s}</span>
              </div>
            ))}
            <div style={{ background: C.softGreen, border: `1px solid ${C.softGreenBorder}`, borderRadius: 12, padding: "12px 14px", marginTop: 14 }}>
              <div style={{ font: `700 12.5px ${JAK}`, color: C.greenDk, marginBottom: 5 }}>A booked call is what counts</div>
              <div style={{ font: `500 12.5px/1.5 ${JAK}`, color: C.slate }}>A form on its own often goes nowhere. Someone who books a call almost always gets set up — and you only earn on sign-ups that get accepted. If you get one thing right today, make it this.</div>
            </div>

            <div style={{ ...sub, margin: "16px 0 10px" }}>The offer you share</div>
            <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
              {OFFER.map((o, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: i === 0 ? `1px solid ${C.line2}` : "none" }}>
                  <span style={{ font: `600 13px ${JAK}`, color: C.ink, width: 66, flex: "none" }}>{o.w}</span>
                  <span style={{ font: `700 14px ${GRO}`, color: C.greenDk }}>{o.a}</span>
                  <span style={{ font: `500 12px ${JAK}`, color: C.muted }}>{o.d}</span>
                </div>
              ))}
            </div>
            <p style={{ font: `600 12px ${JAK}`, color: C.warn, margin: "0 0 16px" }}>Payment comes after setup — never cash on the spot.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: C.softGreen, border: `1px solid ${C.softGreenBorder}`, borderRadius: 12, padding: 13 }}>
                <div style={{ font: `700 11px ${JAK}`, color: C.greenDk, marginBottom: 9 }}>DO</div>
                {DOS.map((d, i) => <div key={i} style={{ font: `500 12px/1.4 ${JAK}`, color: "#3f5c4a", marginBottom: 7 }}>{d}</div>)}
              </div>
              <div style={{ background: "#fdf0f0", border: "1px solid #f5d0d0", borderRadius: 12, padding: 13 }}>
                <div style={{ font: `700 11px ${JAK}`, color: "#dc2626", marginBottom: 9 }}>DON&apos;T</div>
                {DONTS.map((d, i) => <div key={i} style={{ font: `500 12px/1.4 ${JAK}`, color: "#8a4a4a", marginBottom: 7 }}>{d}</div>)}
              </div>
            </div>
          </div>

          {/* tips to reassure */}
          <div style={card}>
            <div style={{ ...secLbl, marginBottom: 4 }}>Tips to reassure them</div>
            <p style={{ font: `500 12px ${JAK}`, color: C.muted, margin: "0 0 12px" }}>Handy points to bring up if someone&apos;s unsure.</p>
            {TIPS.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ color: C.green, font: `700 13px ${JAK}`, flex: "none", lineHeight: 1.4 }}>✓</span>
                <span style={{ font: `500 13px/1.45 ${JAK}`, color: C.slate }}>{t}</span>
              </div>
            ))}
          </div>

          {/* ambassador faqs */}
          <div style={card}>
            <div style={{ ...secLbl, marginBottom: 4 }}>Questions people will ask you</div>
            <p style={{ font: `500 12px ${JAK}`, color: C.muted, margin: "0 0 8px" }}>Use these to answer anyone you sign up.</p>
            {faqBlock(AMBASSADOR_FAQ, "a")}
          </div>

          {/* marketer faqs */}
          <div style={card}>
            <div style={{ ...secLbl, marginBottom: 4 }}>Your FAQs</div>
            <p style={{ font: `500 12px ${JAK}`, color: C.muted, margin: "0 0 8px" }}>About your pay, payouts and getting re-invited.</p>
            {faqBlock(MARKETER_FAQ, "m")}
          </div>

          {/* payout details */}
          <div style={card}>
            <div style={{ ...secLbl, marginBottom: 3 }}>Your payout details</div>
            <p style={{ font: `500 12.5px ${JAK}`, color: C.muted, margin: "0 0 14px" }}>Keep these up to date so we can pay you.</p>
            <div style={{ font: `600 11px ${JAK}`, color: C.muted, marginBottom: 6 }}>Contact</div>
            <div style={{ display: "flex", gap: 9, marginBottom: 14 }}>
              <select value={form.contactMethod} onChange={(e) => setForm({ ...form, contactMethod: e.target.value })} style={sel}><option>WhatsApp</option><option>Telegram</option><option>Viber</option><option>Email</option></select>
              <input value={form.contactHandle} onChange={(e) => setForm({ ...form, contactHandle: e.target.value })} placeholder="number / @handle" style={inp} />
            </div>
            <div style={{ font: `600 11px ${JAK}`, color: C.muted, marginBottom: 6 }}>Pay me via</div>
            <div style={{ display: "flex", gap: 9, marginBottom: 16 }}>
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} style={sel}><option>GCash</option><option>Maya</option><option>Bank transfer</option></select>
              <input value={form.paymentDetails} onChange={(e) => setForm({ ...form, paymentDetails: e.target.value })} placeholder="account number / details" style={inp} />
            </div>
            <button onClick={save} disabled={saving} style={{ width: "100%", font: `700 14px ${JAK}`, color: "#fff", background: saved ? C.greenDk : C.green, border: "none", padding: 14, borderRadius: 12, cursor: "pointer" }}>{saving ? "Saving…" : saved ? "Saved ✓" : "Save details"}</button>
          </div>

          <p style={{ textAlign: "center", font: `500 12px ${JAK}`, color: C.muted2, padding: "4px 0 20px" }}>Questions? Message your LinkedVelocity contact.</p>
        </div>

        {/* sticky CTA */}
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 440, padding: "12px 20px", background: "rgba(244,246,248,.94)", backdropFilter: "blur(10px)", borderTop: `1px solid #e6e9ee`, zIndex: 20 }}>
          <button onClick={() => setQrOpen(true)} style={{ width: "100%", font: `700 15px ${JAK}`, color: "#fff", background: C.green, border: "none", padding: 15, borderRadius: 14, cursor: "pointer", boxShadow: "0 10px 24px -10px rgba(22,163,74,.7)" }}>▣ Show QR to sign someone up</button>
        </div>

        {/* QR modal */}
        {qrOpen && (
          <div onClick={() => setQrOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(9,17,12,.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, background: "#fff", borderRadius: 22, padding: "26px 24px", textAlign: "center" }}>
              <div style={{ font: `600 18px ${GRO}`, color: C.ink, marginBottom: 5 }}>Scan to sign up</div>
              <p style={{ font: `500 12.5px ${JAK}`, color: C.muted, margin: "0 0 18px" }}>Point their camera here — it opens your referral form.</p>
              <div style={{ width: 216, height: 216, margin: "0 auto 18px", border: `1px solid ${C.line}`, borderRadius: 16, padding: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrSrc} alt="Your referral QR code" width={192} height={192} style={{ width: "100%", height: "100%" }} />
              </div>
              <div style={{ font: `500 11.5px ${GRO}`, color: C.muted2, marginBottom: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{myLinkShort}</div>
              <div style={{ display: "flex", gap: 9 }}>
                <button onClick={copyLink} style={{ flex: 1, font: `700 13.5px ${JAK}`, color: C.greenDk, background: C.softGreen, border: `1px solid ${C.softGreenBorder}`, padding: 12, borderRadius: 11, cursor: "pointer" }}>{linkCopied ? "Copied ✓" : "Copy link"}</button>
                <button onClick={() => setQrOpen(false)} style={{ flex: 1, font: `700 13.5px ${JAK}`, color: "#fff", background: C.green, border: "none", padding: 12, borderRadius: 11, cursor: "pointer" }}>Done</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
