"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { blogFontVars } from "@/lib/blog-fonts";

const POP = "var(--font-poppins)", INT = "var(--font-inter)", MONO = "var(--font-jbmono)";
const INDUSTRY_COLORS: Record<string, string> = { Sales: "#5747C9", Marketing: "#B23150", Technology: "#0E7C74", Operations: "#0A66C2", Finance: "#946011" };

interface Account {
  id: string;
  linkedinName: string;
  linkedinHeadline: string | null;
  connectionCount: number;
  profilePhotoUrl: string | null;
  monthlyPrice: number | string;
  hasSalesNav: boolean;
  linkedinVerified?: boolean;
  industry?: string | null;
}

const shortName = (n: string) => { const p = n.replace(/\s*\(.*\)\s*$/, "").trim().split(/\s+/).filter(Boolean); return p.length < 2 ? (p[0] || "") : `${p[0]} ${p[p.length - 1][0].toUpperCase()}.`; };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#8899A6" }}>Loading…</div>}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);
  const [vetted, setVetted] = useState<boolean | null>(null);
  const [showVetting, setShowVetting] = useState(false);
  const [vetForm, setVetForm] = useState({ company: "", website: "", role: "", useCase: "", tools: "", agreed: false });
  const [vetSaving, setVetSaving] = useState(false);
  const [vetError, setVetError] = useState("");

  const accountIds = searchParams.get("accounts")?.split(",").filter(Boolean) || [];

  useEffect(() => {
    if (accountIds.length === 0) { router.push("/catalogue"); return; }
    Promise.all([
      Promise.all(accountIds.map((id) => fetch(`/api/accounts/${id}`).then((r) => r.json()).then((d) => d.account))),
      fetch("/api/wallet/balance").then((r) => r.json()).catch(() => ({ balance: "0" })),
      fetch("/api/vetting").then((r) => r.json()).catch(() => ({ vetted: false })),
    ]).then(([accountResults, balanceData, vettingData]) => {
      setAccounts(accountResults.filter(Boolean));
      setUsdcBalance(parseFloat(balanceData.balance || "0"));
      setVetted(!!vettingData.vetted);
      setLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const total = accounts.reduce((sum, a) => sum + Number(a.monthlyPrice), 0);
  const hasSufficientBalance = usdcBalance !== null && usdcBalance >= total;

  const handleCheckout = async () => {
    setCheckingOut(true);
    setCheckoutError("");
    try {
      const res = await fetch("/api/rentals/checkout-usdc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountIds: accounts.map((a) => a.id), autoRenew }) });
      const data = await res.json();
      if (res.status === 401) { router.push("/login?message=You must sign in or sign up before you can rent accounts."); return; }
      if (!res.ok) { setCheckoutError(data.error || "Payment failed"); return; }
      setCheckoutSuccess(true);
      setTimeout(() => router.push("/dashboard?rental=success"), 2000);
    } catch { setCheckoutError("Something went wrong. Please try again."); }
    finally { setCheckingOut(false); }
  };

  const startPayment = () => {
    if (vetted) { handleCheckout(); return; }
    setShowVetting(true);
    fetch("/api/vetting", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) }).catch(() => {});
  };
  const submitVetting = async () => {
    setVetError("");
    if (!vetForm.company.trim() || !vetForm.website.trim() || !vetForm.role.trim() || !vetForm.useCase.trim()) { setVetError("Please fill in your company, website/LinkedIn, role, and what you'll use the account for."); return; }
    if (!vetForm.agreed) { setVetError("Please agree to the use policy to continue."); return; }
    setVetSaving(true);
    try {
      const res = await fetch("/api/vetting", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(vetForm) });
      const d = await res.json();
      if (!res.ok) { setVetError(d.error || "Something went wrong"); return; }
      setVetted(true); setShowVetting(false); handleCheckout();
    } catch { setVetError("Something went wrong. Please try again."); }
    finally { setVetSaving(false); }
  };

  const removeAccount = (id: string) => {
    const remaining = accounts.filter((a) => a.id !== id);
    if (remaining.length === 0) { router.push("/catalogue"); return; }
    setAccounts(remaining);
    const p = new URLSearchParams(); p.set("accounts", remaining.map((a) => a.id).join(","));
    router.replace(`/checkout?${p.toString()}`);
  };

  if (loading) return <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#8A93A2", fontSize: 14 }}>Loading your selection…</div>;

  const TRUST = [
    { bg: "#E4F6EC", fg: "#067A45", icon: <path d="M20 6L9 17l-5-5" />, title: "Instant access", body: "Accounts are ready the moment payment clears." },
    { bg: "#EAF2FC", fg: "#0A66C2", icon: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>, title: "Secure via GoLogin", body: "Isolated browser profile + dedicated proxy each." },
    { bg: "#F1EFFB", fg: "#5747C9", icon: <><path d="M3 12a9 9 0 1 0 9-9" /><path d="M3 3v5h5" /></>, title: "Cancel anytime", body: "No lock-in. Stop renewals whenever you want." },
  ];

  return (
    <div className={blogFontVars} style={{ fontFamily: INT, color: "#0B1220", background: "#FBFCFD", minHeight: "100vh" }}>
      <style>{`
        .co-grid{max-width:1140px;margin:0 auto;padding:30px 40px 60px;display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:34px;align-items:start;}
        .co-side{position:sticky;top:24px;align-self:start;}
        .co-trust{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
        .co-cta{transition:transform .18s ease, box-shadow .18s ease;}
        .co-cta:hover{transform:translateY(-2px);}
        @media(max-width:900px){.co-grid{grid-template-columns:1fr;padding:24px 18px 56px;}.co-side{position:static;}.co-trust{grid-template-columns:1fr;}}
      `}</style>

      {/* header */}
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "40px 40px 0" }}>
        <div style={{ fontSize: 13.5, color: "#8A93A2", marginBottom: 14 }}><Link href="/catalogue" style={{ color: "#0A66C2", textDecoration: "none" }}>Browse Accounts</Link> · Checkout</div>
        <h1 style={{ font: `700 clamp(28px,4vw,40px) ${POP}`, letterSpacing: "-0.03em", margin: "0 0 8px" }}>Review &amp; checkout</h1>
        <p style={{ fontSize: 17, color: "#5A6473", margin: 0 }}>Confirm your selected accounts and complete your rental.</p>
      </div>

      <div className="co-grid">
        {/* LEFT */}
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* selected accounts */}
          <div style={{ background: "#fff", border: "1px solid #E6E8EC", borderRadius: 18, padding: 8, boxShadow: "0 4px 14px rgba(16,24,40,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px" }}>
              <span style={{ font: `500 11px ${MONO}`, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8A93A2" }}>{accounts.length} account{accounts.length === 1 ? "" : "s"} selected</span>
              <span style={{ fontSize: 13, color: "#8A93A2" }}>Flat monthly rate each</span>
            </div>
            {accounts.map((a) => {
              const price = Number(a.monthlyPrice);
              const name = shortName(a.linkedinName);
              const ic = a.industry ? (INDUSTRY_COLORS[a.industry] || "#0A66C2") : "#0A66C2";
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderTop: "1px solid #F1F3F6" }}>
                  {a.profilePhotoUrl ? (
                    <img src={a.profilePhotoUrl} alt="" style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#0A66C2,#004182)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", font: `700 16px ${POP}`, flexShrink: 0 }}>{name.charAt(0)}</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ font: `600 15.5px ${POP}`, color: "#0B1220" }}>{name}</span>
                      {a.linkedinVerified && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 600, color: "#0A66C2", background: "#EAF2FC", borderRadius: 6, padding: "2px 7px" }}>✓ Verified</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12.5, color: "#8A93A2" }}>{formatNumber(a.connectionCount)} connections</span>
                      <span style={{ fontSize: 11.5, fontWeight: 600, borderRadius: 6, padding: "2px 8px", ...(a.hasSalesNav ? { color: "#5747C9", background: "#EDEBFB" } : { color: "#96A0AD", background: "#F2F4F7" }) }}>{a.hasSalesNav ? "Sales Nav" : "No Sales Nav"}</span>
                      {a.industry && <span style={{ font: `500 10.5px ${MONO}`, letterSpacing: "0.04em", color: ic, background: ic + "14", borderRadius: 6, padding: "2px 8px" }}>{a.industry}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={{ font: `700 16px ${POP}`, color: "#0B1220" }}>{formatCurrency(price)}</span><span style={{ fontSize: 12.5, color: "#96A0AD" }}>/mo</span>
                  </div>
                  <button onClick={() => removeAccount(a.id)} title="Remove" style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 9, border: "1px solid #EAECEF", background: "#fff", color: "#96A0AD", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              );
            })}
            <Link href="/catalogue" style={{ display: "flex", alignItems: "center", gap: 9, padding: "15px 18px", borderTop: "1px solid #F1F3F6", textDecoration: "none", color: "#0A66C2", fontSize: 14, fontWeight: 600 }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, background: "#EAF2FC", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>+</span>Add another account
            </Link>
          </div>

          {/* trust strip */}
          <div className="co-trust">
            {TRUST.map((t) => (
              <div key={t.title} style={{ background: "#fff", border: "1px solid #EAECEF", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: t.bg, color: t.fg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
                </div>
                <div style={{ font: `600 13.5px ${POP}`, marginBottom: 3 }}>{t.title}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#8A93A2" }}>{t.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: sticky summary */}
        <div className="co-side">
          <div style={{ background: "#fff", border: "1px solid #E6E8EC", borderRadius: 20, padding: 26, boxShadow: "0 16px 44px rgba(16,24,40,0.12), 0 2px 6px rgba(16,24,40,0.05)" }}>
            <div style={{ font: `700 19px ${POP}`, marginBottom: 18 }}>Order summary</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {accounts.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "#5A6473" }}>{shortName(a.linkedinName)}</span>
                  <span style={{ color: "#0B1220", fontWeight: 600 }}>{formatCurrency(Number(a.monthlyPrice))}</span>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: "#EEF0F3", margin: "18px 0" }} />
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ font: `700 16px ${POP}` }}>Monthly total</span>
              <div><span style={{ font: `800 28px ${POP}`, letterSpacing: "-0.02em", color: "#0B1220" }}>{formatCurrency(total)}</span><span style={{ fontSize: 14, color: "#8A93A2" }}>/mo</span></div>
            </div>

            {/* balance */}
            <div style={{ background: hasSufficientBalance ? "#EFFBF3" : "#FDF2F4", border: `1px solid ${hasSufficientBalance ? "#CDEBD9" : "#F6D7DE"}`, borderRadius: 12, padding: "13px 15px", marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ font: `500 11px ${MONO}`, letterSpacing: "0.1em", textTransform: "uppercase", color: hasSufficientBalance ? "#067A45" : "#B23150" }}>Balance</span>
                <span style={{ font: `700 15px ${POP}`, color: "#0B1220" }}>${usdcBalance !== null ? usdcBalance.toFixed(2) : "—"}</span>
              </div>
              {!hasSufficientBalance && <div style={{ fontSize: 12.5, color: "#B23150", marginTop: 6 }}>You need ${(total - (usdcBalance || 0)).toFixed(2)} more to complete this order.</div>}
            </div>

            {/* auto-renew */}
            <button onClick={() => setAutoRenew((v) => !v)} style={{ display: "flex", gap: 11, alignItems: "flex-start", width: "100%", textAlign: "left", background: "#F8FAFC", border: "1px solid #EDEFF2", borderRadius: 12, padding: 14, marginTop: 14, cursor: "pointer" }}>
              <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 700, marginTop: 1, border: "1.5px solid " + (autoRenew ? "#0A66C2" : "#CBD2DB"), background: autoRenew ? "#0A66C2" : "#fff" }}>{autoRenew ? "✓" : ""}</span>
              <span><span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "#0B1220", marginBottom: 2 }}>Auto-renew monthly</span><span style={{ fontSize: 12.5, lineHeight: 1.5, color: "#8A93A2" }}>Renews on the same date each month from your balance. Cancel anytime.</span></span>
            </button>

            {checkoutError && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 10, marginTop: 14, fontSize: 12, color: "#991B1B" }}>{checkoutError}</div>}

            {checkoutSuccess ? (
              <div style={{ background: "#E4F6EC", border: "1px solid #CDEBD9", borderRadius: 12, padding: 14, marginTop: 16, textAlign: "center" }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#067A45" }}>Payment successful!</p>
                <p style={{ fontSize: 12, color: "#067A45", marginTop: 4 }}>Redirecting to your dashboard…</p>
              </div>
            ) : hasSufficientBalance ? (
              <button onClick={startPayment} disabled={checkingOut} className="co-cta" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, width: "100%", background: "#0A66C2", color: "#fff", fontSize: 16, fontWeight: 600, border: "none", borderRadius: 12, padding: 15, marginTop: 16, cursor: "pointer", boxShadow: "0 12px 28px rgba(10,102,194,0.28)", opacity: checkingOut ? 0.6 : 1 }}>{checkingOut ? "Processing…" : `Rent ${accounts.length} account${accounts.length === 1 ? "" : "s"} · ${formatCurrency(total)} →`}</button>
            ) : (
              <button onClick={() => router.push("/dashboard?topup=1#wallet")} className="co-cta" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, width: "100%", background: "#0A66C2", color: "#fff", fontSize: 16, fontWeight: 600, border: "none", borderRadius: 12, padding: 15, marginTop: 16, cursor: "pointer", boxShadow: "0 12px 28px rgba(10,102,194,0.28)" }}>Top up {formatCurrency(total)} &amp; rent →</button>
            )}

            <div style={{ textAlign: "center", fontSize: 12.5, color: "#96A0AD", marginTop: 12 }}>Top up once, rent multiple accounts from your balance.</div>
            <Link href="/catalogue" style={{ display: "block", textAlign: "center", fontSize: 14, color: "#5A6473", textDecoration: "none", marginTop: 14, fontWeight: 500 }}>← Back to browse</Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 9, justifyContent: "center", marginTop: 16, fontSize: 12.5, color: "#96A0AD" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            Secure checkout · cancel anytime
          </div>
        </div>
      </div>

      {/* vetting modal (first-time renters) — preserved */}
      {showVetting && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,20,25,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 16, maxWidth: 460, width: "100%", padding: "26px 26px 22px", maxHeight: "90vh", overflowY: "auto", fontFamily: INT }}>
            <h2 style={{ font: `700 20px ${POP}`, color: "#0B1220", marginBottom: 4 }}>Quick details before you rent</h2>
            <p style={{ fontSize: 13, color: "#536471", marginBottom: 18, lineHeight: 1.5 }}>One-time only — helps us look after your accounts. Takes ~30 seconds.</p>
            {([
              { k: "company", label: "Company name", ph: "Acme Inc." },
              { k: "website", label: "Company website or LinkedIn profile", ph: "acme.com or linkedin.com/in/you" },
              { k: "role", label: "Your role", ph: "Head of Sales" },
              { k: "useCase", label: "What will you use the account for?", ph: "B2B outreach / lead gen" },
              { k: "tools", label: "Any tools you’ll connect? (optional)", ph: "e.g. none, Sales Navigator" },
            ] as const).map((f) => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>{f.label}</label>
                <input value={(vetForm as Record<string, string | boolean>)[f.k] as string} onChange={(e) => setVetForm((v) => ({ ...v, [f.k]: e.target.value }))} placeholder={f.ph} style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #E8E6E1", fontSize: 14, fontFamily: INT, outline: "none" }} />
              </div>
            ))}
            <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 6, marginBottom: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={vetForm.agreed} onChange={(e) => setVetForm((v) => ({ ...v, agreed: e.target.checked }))} style={{ marginTop: 2 }} />
              <span style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.5 }}>I’ve read and agree to the <a href="/account-guide" target="_blank" style={{ color: "#0A66C2", fontWeight: 600 }}>use policy</a>, and I’m responsible for all use of these accounts — including my team.</span>
            </label>
            {vetError && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: 9, marginBottom: 12, fontSize: 12, color: "#991B1B" }}>{vetError}</div>}
            <button onClick={submitVetting} disabled={vetSaving} style={{ width: "100%", padding: 13, borderRadius: 10, background: "#0A66C2", color: "#fff", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: INT, opacity: vetSaving ? 0.6 : 1 }}>{vetSaving ? "Saving…" : "Continue to payment →"}</button>
            <button onClick={() => setShowVetting(false)} style={{ width: "100%", padding: 9, borderRadius: 10, background: "transparent", color: "#536471", fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", fontFamily: INT, marginTop: 6 }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
