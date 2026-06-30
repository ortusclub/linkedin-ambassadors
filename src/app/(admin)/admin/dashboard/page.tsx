"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { formatCurrency, formatDate } from "@/lib/utils";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans" });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-grotesk" });

interface Stats {
  netProfit: number; mrr: number; payouts: number; activeRentals: number;
  totalCustomers: number; newCustomers30d: number; renewalsDue30d: number;
  vettingStarted: number; vettingDropped: number; atRisk: number;
  totalAccounts: number; availableAccounts: number; rentedAccounts: number;
  offlineAccounts: number; restrictedAccounts: number; utilization: number; appsToReview: number;
}
interface Activity { type: "rental" | "signup" | "submission" | "restricted"; label: string; date: string; isTest: boolean; }

const THEMES: Record<"dark" | "light", Record<string, string>> = {
  dark: {
    "--page-bg": "#060912", "--frame-bg": "#0a0e17", "--frame-border": "#1b2333",
    "--card": "#111726", "--card-border": "#1e2636", "--card-shadow": "none",
    "--text": "#e6edf6", "--text2": "#c5cedd", "--muted": "#8a97ad", "--label": "#7c8597",
    "--section-label": "#5b6678", "--faint-num": "#5b6678", "--accent": "#4f8cff", "--link": "#7eb0ff",
    "--green": "#34d399", "--track": "#1e2636", "--divider": "#1b2334",
    "--blue-chip-bg": "rgba(79,140,255,.16)", "--blue-chip-text": "#7eb0ff",
    "--green-chip-bg": "rgba(52,211,153,.16)", "--green-chip-text": "#34d399",
    "--neutral-chip-bg": "rgba(138,151,173,.14)", "--neutral-chip-text": "#9aa6ba",
    "--money-bg": "linear-gradient(160deg,#13261f,#0d1521)", "--money-border": "#1f5040",
    "--money-shadow": "0 12px 34px -12px rgba(0,0,0,.6)", "--money-num": "#34d399", "--money-label": "#7fae9b",
    "--money-spark-fill": "rgba(52,211,153,.16)", "--money-spark-stroke": "#34d399",
    "--blue-spark-fill": "rgba(79,140,255,.15)", "--gray-spark-fill": "rgba(91,102,120,.12)", "--gray-spark-stroke": "#5b6678",
    "--warn-bg": "linear-gradient(160deg,#241a0c,#13110b)", "--warn-border": "#5a4318",
    "--warn-label": "#caa258", "--warn-num": "#fbbf24", "--warn-dot": "#fbbf24",
    "--warn-badge-bg": "rgba(251,191,36,.14)", "--warn-badge-text": "#fbbf24",
    "--seg-bg": "#111726", "--seg-border": "#1e2636", "--seg-active-bg": "#34d399", "--seg-active-text": "#0a0e17", "--seg-inactive-text": "#9aa6ba",
    "--date-color": "#6b7585", "--neutral-dot": "#5b6678",
  },
  light: {
    "--page-bg": "#e8eaee", "--frame-bg": "#f5f6f8", "--frame-border": "#e3e6ea",
    "--card": "#ffffff", "--card-border": "#ebedf1", "--card-shadow": "0 1px 2px rgba(16,24,40,.04)",
    "--text": "#0f1729", "--text2": "#334155", "--muted": "#8b95a6", "--label": "#9aa3b2",
    "--section-label": "#9aa3b2", "--faint-num": "#aab2c0", "--accent": "#2563eb", "--link": "#2563eb",
    "--green": "#16a34a", "--track": "#eef1f5", "--divider": "#f0f1f4",
    "--blue-chip-bg": "#e6effe", "--blue-chip-text": "#1d4ed8",
    "--green-chip-bg": "#dcf5e4", "--green-chip-text": "#15803d",
    "--neutral-chip-bg": "#eef1f5", "--neutral-chip-text": "#8b95a6",
    "--money-bg": "linear-gradient(160deg,#effaf3,#ffffff)", "--money-border": "#bbe9cc",
    "--money-shadow": "0 8px 24px -12px rgba(22,163,74,.28)", "--money-num": "#15a34a", "--money-label": "#3f8c5e",
    "--money-spark-fill": "rgba(22,163,74,.12)", "--money-spark-stroke": "#16a34a",
    "--blue-spark-fill": "rgba(37,99,235,.1)", "--gray-spark-fill": "rgba(148,163,184,.1)", "--gray-spark-stroke": "#aab2c0",
    "--warn-bg": "linear-gradient(160deg,#fff8ec,#ffffff)", "--warn-border": "#f5dca5",
    "--warn-label": "#b07d18", "--warn-num": "#d97706", "--warn-dot": "#f59e0b",
    "--warn-badge-bg": "#fdf0d5", "--warn-badge-text": "#b07d18",
    "--seg-bg": "#ffffff", "--seg-border": "#e3e6ea", "--seg-active-bg": "#2563eb", "--seg-active-text": "#ffffff", "--seg-inactive-text": "#647189",
    "--date-color": "#9aa3b2", "--neutral-dot": "#aab2c0",
  },
};

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeTest, setIncludeTest] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const s = typeof window !== "undefined" ? localStorage.getItem("lv-admin-theme") : null;
    if (s === "light" || s === "dark") setTheme(s);
  }, []);
  const changeTheme = (t: "dark" | "light") => { setTheme(t); try { localStorage.setItem("lv-admin-theme", t); } catch {} };

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/admin/stats?includeTest=${includeTest ? "1" : "0"}`)
      .then((r) => r.json())
      .then((data) => { if (!active) return; setStats(data.stats); setActivity(data.recentActivity || []); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [includeTest]);

  const t = THEMES[theme];
  const dark = theme === "dark";
  const vars = {
    ...t,
    "--tg-dark-bg": dark ? t["--text"] : "transparent",
    "--tg-dark-fg": dark ? t["--frame-bg"] : t["--muted"],
    "--tg-light-bg": dark ? "transparent" : t["--text"],
    "--tg-light-fg": dark ? t["--muted"] : t["--frame-bg"],
    fontFamily: F_SANS,
  } as React.CSSProperties;

  const frame: React.CSSProperties = {
    minHeight: "calc(100vh - 120px)", background: "var(--frame-bg)",
    border: "1px solid var(--frame-border)", borderRadius: 24, padding: "26px 28px 30px",
    boxShadow: "var(--frame-shadow,0 40px 90px -30px rgba(0,0,0,.5))",
  };

  if (loading || !stats) {
    return (
      <div className={`${sans.variable} ${grotesk.variable}`} style={vars}>
        <div style={frame}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
            {[1, 2, 3, 4].map((i) => <div key={i} style={{ height: 120, borderRadius: 16, background: "var(--card)", border: "1px solid var(--card-border)" }} />)}
          </div>
        </div>
      </div>
    );
  }

  const margin = stats.mrr > 0 ? Math.round((stats.netProfit / stats.mrr) * 100) : 0;
  const circ = 2 * Math.PI * 25;
  const utilDash = (Math.min(100, Math.max(0, stats.utilization)) / 100) * circ;
  const rentedPct = stats.totalAccounts > 0 ? (stats.rentedAccounts / stats.totalAccounts) * 100 : 0;
  const availPct = stats.totalAccounts > 0 ? (stats.availableAccounts / stats.totalAccounts) * 100 : 0;
  const renewPct = stats.activeRentals > 0 ? Math.min(100, (stats.renewalsDue30d / stats.activeRentals) * 100) : 0;
  const vetPct = stats.vettingStarted > 0 ? Math.round((stats.vettingDropped / stats.vettingStarted) * 100) : 0;

  type Att = { label: string; tone: "warn" | "info" | "neutral"; action: string; href: string };
  const attention: Att[] = [];
  if (stats.restrictedAccounts > 0) attention.push({ label: `${stats.restrictedAccounts} account${stats.restrictedAccounts > 1 ? "s" : ""} restricted — access & billing paused`, tone: "warn", action: "Resolve", href: "/admin/accounts" });
  if (stats.renewalsDue30d > 0) attention.push({ label: `${stats.renewalsDue30d} renewal${stats.renewalsDue30d > 1 ? "s" : ""} due in the next 30 days`, tone: "info", action: "View", href: "/admin/rentals" });
  if (stats.atRisk > 0) attention.push({ label: `${stats.atRisk} rental${stats.atRisk > 1 ? "s" : ""} at-risk — auto-renew off / payment failed`, tone: "warn", action: "View", href: "/admin/rentals" });
  if (stats.appsToReview > 0) attention.push({ label: `${stats.appsToReview} ambassador application${stats.appsToReview > 1 ? "s" : ""} to review`, tone: "info", action: "Review", href: "/admin/ambassadors" });
  if (stats.availableAccounts > 0) attention.push({ label: `${stats.availableAccounts} account${stats.availableAccounts > 1 ? "s" : ""} idle — available, not earning`, tone: "neutral", action: "Assign", href: "/admin/accounts" });
  if (stats.offlineAccounts > 0) attention.push({ label: `${stats.offlineAccounts} account${stats.offlineAccounts > 1 ? "s" : ""} offline`, tone: "warn", action: "View", href: "/admin/accounts" });

  const dotColor = (tone: string) => tone === "warn" ? "var(--warn-dot)" : tone === "neutral" ? "var(--neutral-dot)" : "var(--accent)";
  const actDot = (t: Activity["type"]) => t === "restricted" ? "var(--warn-dot)" : t === "signup" ? "var(--green)" : t === "submission" ? "var(--accent)" : "var(--accent)";

  const sectionLabel: React.CSSProperties = { font: `700 11.5px ${F_SANS}`, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--section-label)", margin: "0 0 11px" };
  const cardLabel: React.CSSProperties = { font: `700 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" };
  const cardSub: React.CSSProperties = { font: `500 11.5px ${F_SANS}`, color: "var(--muted)" };
  const num = (size: number, color = "var(--text)"): React.CSSProperties => ({ font: `600 ${size}px/1 ${F_GRO}`, color, fontVariantNumeric: "tabular-nums", letterSpacing: "-.02em" });

  const StatCard = ({ label, value, sub, valueColor, warn, href, extra }: { label: string; value: React.ReactNode; sub?: React.ReactNode; valueColor?: string; warn?: boolean; href?: string; extra?: React.ReactNode }) => (
    <div
      onClick={href ? () => router.push(href) : undefined}
      style={{
        background: warn ? "var(--warn-bg)" : "var(--card)", border: "1px solid", borderColor: warn ? "var(--warn-border)" : "var(--card-border)",
        borderRadius: 13, padding: 14, display: "flex", flexDirection: "column", gap: 6, minHeight: 112,
        boxShadow: warn ? "none" : "var(--card-shadow)", cursor: href ? "pointer" : "default",
      }}
    >
      <span style={warn ? { ...cardLabel, color: "var(--warn-label)" } : cardLabel}>{label}</span>
      <span style={num(26, valueColor || (warn ? "var(--warn-num)" : "var(--text)"))}>{value}</span>
      <span style={warn ? { ...cardSub, color: "var(--warn-label)" } : cardSub}>{sub}</span>
      {extra}
    </div>
  );

  const Spark = ({ path, points, stroke, fill, h = 30 }: { path?: string; points: string; stroke: string; fill?: string; h?: number }) => (
    <svg viewBox="0 0 100 34" preserveAspectRatio="none" style={{ width: "100%", height: h, display: "block", marginTop: 8 }}>
      {fill && path && <path d={path} fill={fill} />}
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const upPath = "M0,30 L13,26 L26,27 L39,20 L52,15 L65,12 L78,8 L91,6 L100,4 L100,34 L0,34 Z";
  const upPts = "0,30 13,26 26,27 39,20 52,15 65,12 78,8 91,6 100,4";

  return (
    <div className={`${sans.variable} ${grotesk.variable}`} style={vars}>
      <div style={frame}>

        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ font: `600 31px/1 ${F_GRO}`, color: "var(--text)", margin: "0 0 7px", letterSpacing: "-.02em" }}>Dashboard</h1>
            <p style={{ font: `500 13.5px ${F_SANS}`, color: "var(--muted)", margin: 0 }}>How the business is doing — money, demand and supply at a glance.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
            <div style={{ display: "flex", background: "var(--seg-bg)", border: "1px solid var(--seg-border)", borderRadius: 10, padding: 3 }}>
              <button onClick={() => changeTheme("dark")} style={{ font: `600 12px ${F_SANS}`, padding: "6px 15px", borderRadius: 7, cursor: "pointer", border: "none", background: "var(--tg-dark-bg)", color: "var(--tg-dark-fg)" }}>◗ Dark</button>
              <button onClick={() => changeTheme("light")} style={{ font: `600 12px ${F_SANS}`, padding: "6px 15px", borderRadius: 7, cursor: "pointer", border: "none", background: "var(--tg-light-bg)", color: "var(--tg-light-fg)" }}>◖ Light</button>
            </div>
            <div style={{ display: "flex", background: "var(--seg-bg)", border: "1px solid var(--seg-border)", borderRadius: 10, padding: 3 }}>
              <button onClick={() => setIncludeTest(false)} style={{ font: `600 12.5px ${F_SANS}`, padding: "6px 14px", borderRadius: 7, cursor: "pointer", border: "none", color: !includeTest ? "var(--seg-active-text)" : "var(--seg-inactive-text)", background: !includeTest ? "var(--seg-active-bg)" : "transparent" }}>Live</button>
              <button onClick={() => setIncludeTest(true)} style={{ font: `600 12.5px ${F_SANS}`, padding: "6px 14px", borderRadius: 7, cursor: "pointer", border: "none", color: includeTest ? "var(--seg-active-text)" : "var(--seg-inactive-text)", background: includeTest ? "var(--seg-active-bg)" : "transparent" }}>All (incl. test)</button>
            </div>
          </div>
        </div>

        {/* MONEY */}
        <div style={{ marginBottom: 20 }}>
          <div style={sectionLabel}>Money</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr 1fr 1fr", gap: 14 }}>
            <div onClick={() => router.push("/admin/rentals")} style={{ background: "var(--money-bg)", border: "1px solid var(--money-border)", borderRadius: 16, padding: "17px 19px 14px", boxShadow: "var(--money-shadow)", cursor: "pointer" }}>
              <span style={{ font: `700 11px ${F_SANS}`, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--money-label)" }}>Net profit / mo</span>
              <div style={{ ...num(38, "var(--money-num)"), marginTop: 9 }}>{formatCurrency(stats.netProfit)}</div>
              <div style={{ font: `500 12.5px ${F_SANS}`, color: "var(--money-label)", marginTop: 5 }}>{margin}% margin</div>
              <Spark path={upPath} points={upPts} stroke="var(--money-spark-stroke)" fill="var(--money-spark-fill)" h={42} />
            </div>
            <StatCardMoney label="Monthly rev." value={formatCurrency(stats.mrr)} sub="recurring · money in" stroke="var(--accent)" fill="var(--blue-spark-fill)" num={num} cardLabel={cardLabel} cardSub={cardSub} Spark={Spark} path={upPath} pts={upPts} />
            <StatCardMoney label="Amb. payouts" value={formatCurrency(stats.payouts)} sub="money out" stroke="var(--gray-spark-stroke)" fill="var(--gray-spark-fill)" num={num} cardLabel={cardLabel} cardSub={cardSub} Spark={Spark} path="M0,25 L13,25 L26,24 L39,25 L52,25 L65,24 L78,25 L91,25 L100,25 L100,34 L0,34 Z" pts="0,25 13,25 26,24 39,25 52,25 65,24 78,25 91,25 100,25" />
            <div onClick={() => router.push("/admin/rentals")} style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, padding: "17px 18px 14px", boxShadow: "var(--card-shadow)", cursor: "pointer" }}>
              <span style={{ font: `700 11px ${F_SANS}`, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--muted)" }}>Active rentals</span>
              <div style={{ ...num(30, "var(--accent)"), marginTop: 9 }}>{stats.activeRentals}</div>
              <div style={{ font: `500 12px ${F_SANS}`, color: "var(--muted)", marginTop: 5 }}>live now</div>
              <Spark path="M0,28 L13,25 L26,26 L39,22 L52,19 L65,16 L78,13 L91,11 L100,9 L100,34 L0,34 Z" points="0,28 13,25 26,26 39,22 52,19 65,16 78,13 91,11 100,9" stroke="var(--accent)" fill="var(--blue-spark-fill)" />
            </div>
          </div>
        </div>

        {/* two-col */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 372px", gap: 18, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* DEMAND */}
            <div>
              <div style={sectionLabel}>Demand · renters</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
                <StatCard label="Customers" value={stats.totalCustomers} sub={`renting ${stats.rentedAccounts} accounts`} href="/admin/customers"
                  extra={<svg viewBox="0 0 100 22" preserveAspectRatio="none" style={{ width: "100%", height: 18, display: "block", marginTop: "auto" }}><polyline points="0,18 20,16 40,17 60,12 80,9 100,6" fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>} />
                <StatCard label="New (30d)" value={stats.newCustomers30d} sub="new this month" href="/admin/customers" />
                <StatCard label="Renewals ≤30d" value={stats.renewalsDue30d} sub="coming up" href="/admin/rentals"
                  extra={<div style={{ height: 5, borderRadius: 999, background: "var(--track)", marginTop: "auto", overflow: "hidden" }}><div style={{ width: `${renewPct}%`, height: "100%", background: "var(--accent)", borderRadius: 999 }} /></div>} />
                <StatCard label="At-risk" value={stats.atRisk} sub="may churn" warn href="/admin/rentals" valueColor={stats.atRisk > 0 ? "var(--warn-num)" : "var(--faint-num)"} />
                <StatCard label="Vetting drop-off" value={`${stats.vettingDropped}/${stats.vettingStarted}`} sub={stats.vettingStarted > 0 ? `${vetPct}% opened, didn't finish` : "opened form, didn't finish"} href="/admin/customers" valueColor={stats.vettingDropped > 0 ? "var(--warn-num)" : "var(--faint-num)"} />
              </div>
            </div>

            {/* SUPPLY */}
            <div>
              <div style={sectionLabel}>Supply · accounts &amp; ambassadors</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
                <StatCard label="Total accounts" value={stats.totalAccounts} sub="" href="/admin/accounts"
                  extra={<>
                    <div style={{ display: "flex", height: 6, borderRadius: 999, overflow: "hidden", background: "var(--track)", marginTop: 2 }}><div style={{ width: `${rentedPct}%`, background: "var(--accent)" }} /><div style={{ width: `${availPct}%`, background: "var(--green)" }} /></div>
                    <div style={{ display: "flex", gap: 9, marginTop: "auto", font: `500 10.5px ${F_SANS}`, color: "var(--muted)" }}><span style={{ color: "var(--accent)" }}>● {stats.rentedAccounts} rented</span><span style={{ color: "var(--green)" }}>● {stats.availableAccounts} avail</span></div>
                  </>} />
                <StatCard label="Restricted" value={stats.restrictedAccounts} sub="recovering · access & billing paused" warn href="/admin/accounts" valueColor={stats.restrictedAccounts > 0 ? "var(--warn-num)" : "var(--faint-num)"} />
                <div onClick={() => router.push("/admin/accounts")} style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 13, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 118, boxShadow: "var(--card-shadow)", cursor: "pointer" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={cardLabel}>Utilization</span>
                    <span style={{ ...cardSub, maxWidth: 78 }}>accounts earning</span>
                  </div>
                  <div style={{ position: "relative", width: 62, height: 62, flex: "none" }}>
                    <svg width="62" height="62" viewBox="0 0 62 62"><circle cx="31" cy="31" r="25" fill="none" stroke="var(--track)" strokeWidth="7" /><circle cx="31" cy="31" r="25" fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${utilDash} ${circ}`} transform="rotate(-90 31 31)" /></svg>
                    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", font: `600 15px ${F_GRO}`, color: "var(--text)" }}>{stats.utilization}%</span>
                  </div>
                </div>
                <StatCard label="Idle (available)" value={stats.availableAccounts} sub="not earning" href="/admin/accounts" valueColor={stats.availableAccounts > 0 ? "var(--warn-num)" : "var(--faint-num)"}
                  extra={<span style={{ font: `600 10.5px ${F_SANS}`, color: "var(--link)", marginTop: "auto" }}>Assign renters →</span>} />
                <StatCard label="Apps to review" value={stats.appsToReview} sub="ambassador applications" href="/admin/ambassadors" valueColor={stats.appsToReview > 0 ? "var(--text)" : "var(--faint-num)"} />
              </div>
            </div>
          </div>

          {/* right rail */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, padding: "18px 20px", boxShadow: "var(--card-shadow)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--warn-dot)", display: "inline-block", transform: "rotate(45deg)" }} />
                <span style={{ font: `700 13.5px ${F_SANS}`, color: "var(--text)" }}>Needs attention</span>
                <span style={{ marginLeft: "auto", font: `700 11px ${F_SANS}`, color: "var(--warn-badge-text)", background: "var(--warn-badge-bg)", padding: "3px 9px", borderRadius: 999 }}>{attention.length}</span>
              </div>
              {attention.length === 0 ? (
                <p style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted)", padding: "8px 0", margin: 0 }}>All clear — nothing needs you right now. 🎉</p>
              ) : attention.map((a, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "11px 0", borderTop: "1px solid var(--divider)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}><span style={{ width: 7, height: 7, borderRadius: 999, background: dotColor(a.tone), flex: "none" }} /><span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--text2)" }}>{a.label}</span></div>
                  <button onClick={() => router.push(a.href)} style={{ font: `600 11px ${F_SANS}`, color: "var(--link)", background: "var(--blue-chip-bg)", padding: "4px 10px", borderRadius: 7, whiteSpace: "nowrap", border: "none", cursor: "pointer" }}>{a.action}</button>
                </div>
              ))}
            </div>

            <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, padding: "18px 20px", boxShadow: "var(--card-shadow)" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                <span style={{ font: `700 13.5px ${F_SANS}`, color: "var(--text)" }}>Recent activity</span>
              </div>
              {activity.length === 0 ? (
                <p style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted)", padding: "8px 0", margin: 0 }}>No activity yet</p>
              ) : activity.map((a, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--divider)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}><span style={{ width: 7, height: 7, borderRadius: 999, background: actDot(a.type), flex: "none" }} /><span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.label}{a.isTest ? " · TEST" : ""}</span></div>
                  <span style={{ font: `500 11.5px ${F_SANS}`, color: "var(--date-color)", whiteSpace: "nowrap" }}>{formatDate(a.date)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Money card with sparkline (kept separate to reduce repetition).
function StatCardMoney({ label, value, sub, stroke, fill, path, pts, num, cardSub, Spark }: {
  label: string; value: React.ReactNode; sub: string; stroke: string; fill: string; path: string; pts: string;
  num: (s: number, c?: string) => React.CSSProperties; cardLabel: React.CSSProperties; cardSub: React.CSSProperties;
  Spark: (p: { path?: string; points: string; stroke: string; fill?: string; h?: number }) => React.ReactNode;
}) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 16, padding: "17px 18px 14px", boxShadow: "var(--card-shadow)" }}>
      <span style={{ font: `700 11px ${F_SANS}`, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--muted)" }}>{label}</span>
      <div style={{ ...num(30), marginTop: 9 }}>{value}</div>
      <div style={{ ...cardSub, marginTop: 5 }}>{sub}</div>
      {Spark({ path, points: pts, stroke, fill })}
    </div>
  );
}
