"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/utils";

interface Customer {
  id: string;
  fullName: string;
  email: string;
  contactNumber: string | null;
  status: string;
  createdAt: string;
  activeRentals: number;
  totalRentals: number;
  paymentMethod: string;
  isTest: boolean;
  referralSource: string | null;
  vettingStartedAt: string | null;
  vettedAt: string | null;
  vettingInfo: { company?: string; website?: string; role?: string; useCase?: string; tools?: string } | null;
  vettingReview: string | null;
}

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";

// vetting pill: label + colours + whether it opens the answers modal (only when they finished)
function vettingPill(c: Customer): { label: string; bg: string; fg: string; clickable: boolean } {
  if (c.vettedAt) {
    if (c.vettingReview === "verified") return { label: "✓ Verified", bg: "var(--green-chip-bg)", fg: "var(--green-chip-text)", clickable: true };
    if (c.vettingReview === "flagged") return { label: "⚠ Flagged", bg: "var(--st-cancel-bg)", fg: "var(--st-cancel-fg)", clickable: true };
    return { label: "● Needs review", bg: "var(--warn-badge-bg)", fg: "var(--warn-badge-text)", clickable: true };
  }
  if (c.vettingStartedAt) return { label: "⏳ Started, didn't finish", bg: "var(--st-conv-bg)", fg: "var(--st-conv-fg)", clickable: false };
  return { label: "Not vetted", bg: "var(--vet-bg)", fg: "var(--vet-fg)", clickable: false };
}

const GRID = "1fr 172px 120px 120px 104px";

// payment pill: colour by funding type; blank/"—" => "No method"
function paymentPill(pm: string): { label: string; bg: string; fg: string } {
  const none = !pm || pm === "—";
  if (none) return { label: "◈ No method", bg: "var(--pay-none-bg)", fg: "var(--pay-none-fg)" };
  if (pm === "Crypto Wallet") return { label: `◈ ${pm}`, bg: "var(--pay-crypto-bg)", fg: "var(--pay-crypto-fg)" };
  return { label: `◈ ${pm}`, bg: "var(--pay-card-bg)", fg: "var(--pay-card-fg)" };
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [vetView, setVetView] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const [hideTest, setHideTest] = useState(false);
  const [showSignups, setShowSignups] = useState(false);

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((r) => r.json())
      .then((data) => setCustomers(data.customers || []))
      .finally(() => setLoading(false));
  }, []);

  const setReview = async (id: string, review: string) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, vettingReview: review } : c)));
    setVetView((v) => (v && v.id === id ? { ...v, vettingReview: review } : v));
    await fetch("/api/admin/customers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, vettingReview: review }) });
  };

  const toggleTest = async (c: Customer) => {
    const next = !c.isTest;
    setCustomers((prev) => prev.map((x) => x.id === c.id ? { ...x, isTest: next } : x));
    const res = await fetch("/api/admin/customers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, isTest: next }) });
    if (!res.ok) { setCustomers((prev) => prev.map((x) => x.id === c.id ? { ...x, isTest: !next } : x)); alert("Failed to update test flag"); }
  };

  const handleDelete = async (c: Customer) => {
    if (!window.confirm(`Permanently delete ${c.fullName} (${c.email}) and ALL their data — rentals, transactions, sessions? This can't be undone.`)) return;
    setDeleting(c.id);
    try {
      const res = await fetch("/api/admin/customers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id }) });
      if (res.ok) setCustomers((prev) => prev.filter((x) => x.id !== c.id));
      else { const d = await res.json().catch(() => ({})); alert("Failed: " + (d.error || res.status)); }
    } finally { setDeleting(null); }
  };

  const counts = useMemo(() => ({
    renters: customers.filter((c) => c.totalRentals > 0).length,
    signups: customers.filter((c) => c.totalRentals === 0 && !c.isTest).length,
    test: customers.filter((c) => c.isTest).length,
    liveRentals: customers.reduce((s, c) => s + c.activeRentals, 0),
  }), [customers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (hideTest && c.isTest) return false;
      // default view = people who've actually rented; never-rented signups hidden until "Show signups"
      if (!showSignups && c.totalRentals === 0) return false;
      if (!q) return true;
      return `${c.fullName} ${c.email} ${c.contactNumber || ""} ${c.referralSource || ""} ${c.paymentMethod}`.toLowerCase().includes(q);
    });
  }, [customers, query, hideTest, showSignups]);

  const labelCss: React.CSSProperties = { font: `700 10px ${F_SANS}`, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--label)" };
  const isTG = (c: string | null) => (c || "").startsWith("telegram:");

  if (loading) return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[1, 2, 3].map((i) => <div key={i} style={{ height: 64, borderRadius: 14, background: "var(--card)", border: "1px solid var(--card-border)" }} />)}</div>;

  return (
    <div>
      {/* title */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ font: `600 30px/1 ${F_GRO}`, color: "var(--text)", margin: "0 0 8px", letterSpacing: "-.02em" }}>LinkedVelocity Accounts</h1>
        <p style={{ font: `500 13.5px/1.5 ${F_SANS}`, color: "var(--muted)", margin: 0, maxWidth: 680 }}>Customers who rent LinkedIn profiles — your demand side. Manage their details and see how many rentals each one has.</p>
      </div>

      {/* summary + toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ font: `600 22px ${F_GRO}`, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{counts.renters}</span>
            <span style={{ font: `600 12px ${F_SANS}`, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--label)" }}>renters</span>
          </div>
          <span style={{ width: 1, height: 20, background: "var(--divider)" }} />
          {[["var(--muted2)", `${counts.signups} signups`], ["var(--test-fg)", `${counts.test} test`], ["var(--st-active-fg)", `${counts.liveRentals} live rentals`]].map(([dot, txt]) => (
            <span key={txt} style={{ display: "inline-flex", alignItems: "center", gap: 6, font: `500 12.5px ${F_SANS}`, color: "var(--muted)" }}><span style={{ width: 7, height: 7, borderRadius: 999, background: dot }} />{txt}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or contact…"
            style={{ width: 300, maxWidth: "50vw", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 9, padding: "9px 12px", font: `500 13px ${F_SANS}`, color: "var(--input-fg)", outline: "none" }} />
          <button onClick={() => setShowSignups((v) => !v)} title="Signups who registered but never rented"
            style={{ font: `600 12.5px ${F_SANS}`, whiteSpace: "nowrap", padding: "9px 14px", borderRadius: 9, cursor: "pointer", border: "1px solid", ...(showSignups
              ? { background: "var(--subtab-active-bg)", color: "var(--subtab-active-fg)", borderColor: "transparent" }
              : { background: "var(--btn-secondary-bg)", color: "var(--btn-secondary-fg)", borderColor: "var(--btn-secondary-border)" }) }}>{showSignups ? "Hide signups" : `Show signups${counts.signups ? ` (${counts.signups})` : ""}`}</button>
          <button onClick={() => setHideTest((v) => !v)}
            style={{ font: `600 12.5px ${F_SANS}`, whiteSpace: "nowrap", padding: "9px 14px", borderRadius: 9, cursor: "pointer", border: "1px solid", ...(hideTest
              ? { background: "var(--subtab-active-bg)", color: "var(--subtab-active-fg)", borderColor: "transparent" }
              : { background: "var(--btn-secondary-bg)", color: "var(--btn-secondary-fg)", borderColor: "var(--btn-secondary-border)" }) }}>{hideTest ? "Show test" : "Hide test"}</button>
        </div>
      </div>

      {/* list */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--panel-shadow)" }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 18, padding: "13px 22px", borderBottom: "1px solid var(--divider)" }}>
          <span style={labelCss}>Renter</span><span style={labelCss}>Status &amp; payment</span><span style={labelCss}>Rentals</span><span style={labelCss}>Joined</span><span />
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", font: `500 13px ${F_SANS}`, color: "var(--muted)" }}>{customers.length === 0 ? "No renter accounts yet." : (!showSignups && counts.signups > 0) ? `No active renters in view — ${counts.signups} signup${counts.signups > 1 ? "s" : ""} haven't rented yet. Click “Show signups” to see them.` : "No renters match."}</div>
        ) : filtered.map((c) => {
          const vp = vettingPill(c);
          const pp = paymentPill(c.paymentMethod);
          const meta = c.referralSource ? `Heard from ${c.referralSource}` : "";
          return (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: GRID, gap: 18, alignItems: "center", padding: "15px 22px", borderBottom: "1px solid var(--divider)" }}>
              {/* renter */}
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ font: `600 14px ${F_SANS}`, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.fullName}</span>
                  {c.isTest && <span style={{ font: `700 9px ${F_SANS}`, letterSpacing: ".06em", padding: "2px 6px", borderRadius: 5, flex: "none", background: "var(--test-bg)", color: "var(--test-fg)" }}>TEST</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  {c.contactNumber && <span style={{ font: `700 9.5px ${F_SANS}`, letterSpacing: ".03em", padding: "2px 6px", borderRadius: 5, flex: "none", background: "var(--tag-bg)", color: isTG(c.contactNumber) ? "var(--tg-fg)" : "var(--wa-fg)" }}>{isTG(c.contactNumber) ? "TG" : "WA"}</span>}
                  <span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.contactNumber ? `${c.contactNumber.replace(/^(whatsapp|telegram):/, "")}  ·  ` : ""}{c.email}
                  </span>
                </div>
                {meta && <div style={{ font: `500 11px ${F_SANS}`, color: "var(--muted2)" }}>{meta}</div>}
              </div>
              {/* status + vetting */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
                <span style={{ font: `600 11px ${F_SANS}`, padding: "3px 10px", borderRadius: 999, ...(c.status === "active" ? { background: "var(--st-active-bg)", color: "var(--st-active-fg)" } : { background: "var(--st-cancel-bg)", color: "var(--st-cancel-fg)" }) }}>{c.status}</span>
                <button onClick={() => vp.clickable && setVetView(c)} title={vp.clickable ? "View vetting answers" : undefined}
                  style={{ font: `500 11px ${F_SANS}`, padding: "2px 9px", borderRadius: 999, border: "none", background: vp.bg, color: vp.fg, cursor: vp.clickable ? "pointer" : "default", textAlign: "left" }}>{vp.label}</button>
                <span style={{ font: `600 11px ${F_SANS}`, padding: "2px 9px", borderRadius: 999, background: pp.bg, color: pp.fg }}>{pp.label}</span>
              </div>
              {/* rentals */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ font: `600 16px ${F_GRO}`, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{c.activeRentals}</span>
                <span style={{ font: `500 13px ${F_SANS}`, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>/ {c.totalRentals}</span>
                <span style={{ font: `500 10.5px ${F_SANS}`, color: "var(--label)", marginLeft: 2 }}>active</span>
              </div>
              {/* joined */}
              <span style={{ font: `500 12.5px ${F_SANS}`, color: "var(--text2)" }}>{formatDate(c.createdAt)}</span>
              {/* actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                <button onClick={() => toggleTest(c)} title="Toggle test flag — test customers are hidden from live dashboard numbers"
                  style={{ font: `600 11.5px ${F_SANS}`, padding: "4px 9px", borderRadius: 7, border: "none", cursor: "pointer", whiteSpace: "nowrap", background: "var(--test-bg)", color: "var(--test-fg)" }}>{c.isTest ? "Unmark test" : "Mark test"}</button>
                <button onClick={() => handleDelete(c)} disabled={deleting === c.id} title="Permanently delete this customer + all their data"
                  style={{ font: `600 12px ${F_SANS}`, color: "var(--delete-color)", background: "transparent", border: "none", cursor: "pointer", padding: "4px 6px", opacity: deleting === c.id ? 0.5 : 1 }}>{deleting === c.id ? "…" : "Delete"}</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* vetting modal */}
      {vetView && (
        <div onClick={() => setVetView(null)} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.5)", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 18, padding: 24, boxShadow: "0 20px 60px -20px rgba(0,0,0,.6)", maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ font: `600 18px ${F_GRO}`, color: "var(--text)", margin: 0 }}>Vetting — {vetView.fullName}</h2>
                <p style={{ font: `500 12px ${F_SANS}`, color: "var(--muted)", margin: "4px 0 0" }}>{vetView.email}{vetView.vettedAt ? ` · vetted ${formatDate(vetView.vettedAt)}` : ""}</p>
              </div>
              <button onClick={() => setVetView(null)} style={{ font: "400 22px/1 sans-serif", color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {[["Company", vetView.vettingInfo?.company], ["Website / LinkedIn", vetView.vettingInfo?.website], ["Role", vetView.vettingInfo?.role], ["Use case", vetView.vettingInfo?.useCase], ["Tools", vetView.vettingInfo?.tools || "—"]].map(([label, val]) => (
                <div key={label as string}>
                  <div style={{ ...labelCss, marginBottom: 3 }}>{label}</div>
                  <div style={{ font: `500 13.5px ${F_SANS}`, color: "var(--text)" }}>
                    {label === "Website / LinkedIn" && val
                      ? <a href={String(val).startsWith("http") ? String(val) : `https://${val}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--link)", wordBreak: "break-all" }}>{val}</a>
                      : (val || "—")}
                  </div>
                </div>
              ))}
              <div>
                <div style={{ ...labelCss, marginBottom: 3 }}>Use policy</div>
                <div style={{ font: `500 13.5px ${F_SANS}`, color: "var(--st-active-fg)" }}>✓ Agreed (responsible for own + team&apos;s use)</div>
              </div>
            </div>
            <div style={{ marginTop: 18, borderTop: "1px solid var(--divider)", paddingTop: 16 }}>
              <div style={{ ...labelCss, marginBottom: 6 }}>Your review {vetView.vettingReview === "verified" ? "— ✓ Verified" : vetView.vettingReview === "flagged" ? "— ⚠ Flagged" : "— pending your check"}</div>
              <p style={{ font: `500 12px ${F_SANS}`, color: "var(--muted)", margin: "0 0 12px" }}>Check their company/LinkedIn looks legit, then mark it. (Doesn&apos;t affect their access — it&apos;s your record.)</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setReview(vetView.id, "verified")} style={{ flex: 1, font: `600 13px ${F_SANS}`, color: "#fff", background: "var(--sheets-btn-bg)", border: "none", padding: "9px 12px", borderRadius: 9, cursor: "pointer" }}>✓ Verify</button>
                <button onClick={() => setReview(vetView.id, "flagged")} style={{ flex: 1, font: `600 13px ${F_SANS}`, color: "#fff", background: "var(--delete-color)", border: "none", padding: "9px 12px", borderRadius: 9, cursor: "pointer" }}>⚠ Flag</button>
                {vetView.vettingReview !== "pending" && (
                  <button onClick={() => setReview(vetView.id, "pending")} style={{ font: `500 13px ${F_SANS}`, color: "var(--muted)", background: "transparent", border: "1px solid var(--btn-secondary-border)", padding: "9px 12px", borderRadius: 9, cursor: "pointer" }}>Reset</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
