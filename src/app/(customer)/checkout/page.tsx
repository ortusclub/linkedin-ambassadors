"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatNumber, formatCurrency } from "@/lib/utils";

interface Account {
  id: string;
  linkedinName: string;
  linkedinHeadline: string | null;
  connectionCount: number;
  profilePhotoUrl: string | null;
  monthlyPrice: number | string;
  hasSalesNav: boolean;
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'80vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:'#8899A6'}}>Loading...</div></div>}>
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
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);

  const accountIds = searchParams.get("accounts")?.split(",").filter(Boolean) || [];

  useEffect(() => {
    if (accountIds.length === 0) {
      router.push("/catalogue");
      return;
    }

    // Fetch account details + wallet info in parallel
    Promise.all([
      Promise.all(
        accountIds.map((id) =>
          fetch(`/api/accounts/${id}`).then((r) => r.json()).then((d) => d.account)
        )
      ),
      fetch("/api/wallet/balance").then((r) => r.json()).catch(() => ({ balance: "0" })),
      fetch("/api/wallet/deposit-address").then((r) => r.json()).catch(() => ({ address: null })),
    ]).then(([accountResults, balanceData, addressData]) => {
      setAccounts(accountResults.filter(Boolean));
      setUsdcBalance(parseFloat(balanceData.balance || "0"));
      setDepositAddress(addressData.address || null);
      setLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const total = accounts.reduce((sum, a) => sum + Number(a.monthlyPrice), 0);
  const hasSufficientBalance = usdcBalance !== null && usdcBalance >= total;

  const handleCheckout = async () => {
    setCheckingOut(true);
    setCheckoutError("");
    try {
      const res = await fetch("/api/rentals/checkout-usdc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountIds: accounts.map((a) => a.id), autoRenew }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/login?message=You must sign in or sign up before you can rent accounts.");
        return;
      }
      if (!res.ok) {
        setCheckoutError(data.error || "Payment failed");
        return;
      }
      setCheckoutSuccess(true);
      setTimeout(() => router.push("/dashboard?rental=success"), 2000);
    } catch {
      setCheckoutError("Something went wrong. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  const copyAddress = () => {
    if (depositAddress) {
      navigator.clipboard.writeText(depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const removeAccount = (id: string) => {
    const remaining = accounts.filter((a) => a.id !== id);
    if (remaining.length === 0) {
      router.push("/catalogue");
      return;
    }
    setAccounts(remaining);
    const newParams = new URLSearchParams();
    newParams.set("accounts", remaining.map((a) => a.id).join(","));
    router.replace(`/checkout?${newParams.toString()}`);
  };

  if (loading) {
    return (
      <div style={{minHeight:'80vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{color:'#8899A6',fontSize:14}}>Loading your selection...</div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'#FAFAF8',fontFamily:"'DM Sans','Instrument Sans',system-ui,sans-serif",WebkitFontSmoothing:'antialiased'}}>
      <div style={{maxWidth:900,margin:'0 auto',padding:'48px 24px 80px'}}>

        {/* Header */}
        <h1 style={{fontSize:'clamp(24px,3vw,36px)',fontWeight:700,letterSpacing:'-0.03em',color:'#0F1419',marginBottom:8,fontFamily:"'Instrument Sans','DM Sans',system-ui,sans-serif"}}>
          Checkout
        </h1>
        <p style={{fontSize:14,color:'#536471',marginBottom:32}}>
          Review your selected accounts and proceed to payment.
        </p>

        <div style={{display:'grid',gap:32,gridTemplateColumns:'1fr 340px'}}>
          {/* Left: Account list */}
          <div>
            <div style={{background:'#fff',border:'1px solid #E8E6E1',borderRadius:16,overflow:'hidden'}}>
              <div style={{padding:'16px 20px',borderBottom:'1px solid #E8E6E1'}}>
                <span style={{fontSize:13,fontWeight:600,color:'#536471',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                  {accounts.length} Account{accounts.length !== 1 ? "s" : ""} Selected
                </span>
              </div>
              {accounts.map((a, i) => {
                const price = Number(a.monthlyPrice);
                const displayName = a.linkedinName.replace(/\s*\(.*\)\s*$/, "");
                return (
                  <div key={a.id} style={{padding:'16px 20px',borderBottom: i < accounts.length - 1 ? '1px solid #F0EFEB' : 'none',display:'flex',alignItems:'center',gap:14}}>
                    {a.profilePhotoUrl ? (
                      <img src={a.profilePhotoUrl} alt={displayName} style={{width:40,height:40,borderRadius:10,objectFit:'cover'}} />
                    ) : (
                      <div style={{width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#0A66C2,#004182)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:14}}>
                        {displayName.charAt(0)}
                      </div>
                    )}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:14,color:'#0F1419'}}>{displayName}</div>
                      <div style={{fontSize:12,color:'#8899A6',marginTop:1}}>
                        {formatNumber(a.connectionCount)} connections
                        {a.hasSalesNav && <span style={{marginLeft:8,color:'#7C3AED',fontWeight:600}}>Sales Nav</span>}
                      </div>
                    </div>
                    <div style={{fontWeight:700,fontSize:15,color:'#0F1419',whiteSpace:'nowrap'}}>
                      {formatCurrency(price)}<span style={{fontWeight:400,color:'#8899A6',fontSize:12}}>/mo</span>
                    </div>
                    <button
                      onClick={() => removeAccount(a.id)}
                      style={{background:'none',border:'none',cursor:'pointer',color:'#8899A6',fontSize:18,padding:'4px',lineHeight:1}}
                      title="Remove"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Summary + Checkout */}
          <div>
            <div style={{background:'#fff',border:'1px solid #E8E6E1',borderRadius:16,padding:24,position:'sticky',top:24}}>
              <h3 style={{fontSize:16,fontWeight:700,color:'#0F1419',marginBottom:16,fontFamily:"'Instrument Sans',sans-serif"}}>Order Summary</h3>
              <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:14}}>
                  <span style={{color:'#536471'}}>{accounts.length} account{accounts.length !== 1 ? "s" : ""}</span>
                  <span style={{fontWeight:600,color:'#0F1419'}}>{formatCurrency(total)}/mo</span>
                </div>
                <div style={{borderTop:'1px solid #E8E6E1',paddingTop:10,display:'flex',justifyContent:'space-between',fontSize:16}}>
                  <span style={{fontWeight:700,color:'#0F1419'}}>Monthly Total</span>
                  <span style={{fontWeight:700,color:'#0F1419'}}>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* USDC Balance */}
              <div style={{background:hasSufficientBalance ? '#E6F9EE' : '#FEF2F2',border:`1px solid ${hasSufficientBalance ? '#BBF7D0' : '#FECACA'}`,borderRadius:10,padding:14,marginBottom:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:600,color:hasSufficientBalance ? '#166534' : '#991B1B',textTransform:'uppercase',letterSpacing:'0.05em'}}>USDC Balance</span>
                  <span style={{fontSize:16,fontWeight:700,color:hasSufficientBalance ? '#166534' : '#991B1B'}}>
                    ${usdcBalance !== null ? usdcBalance.toFixed(2) : '—'}
                  </span>
                </div>
                {!hasSufficientBalance && (
                  <p style={{fontSize:12,color:'#991B1B',marginTop:4}}>
                    You need ${(total - (usdcBalance || 0)).toFixed(2)} more USDC to complete this order.
                  </p>
                )}
              </div>

              {/* Auto-renew */}
              <label style={{display:'flex',alignItems:'flex-start',gap:10,padding:14,background:'#F3F2EE',borderRadius:10,marginBottom:16,cursor:'pointer'}}>
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.target.checked)}
                  style={{accentColor:'#0A66C2',marginTop:2,width:16,height:16,cursor:'pointer'}}
                />
                <div>
                  <p style={{fontSize:13,fontWeight:600,color:'#0F1419'}}>Auto-renew monthly</p>
                  <p style={{fontSize:11,color:'#8899A6',marginTop:2}}>Renews on the same date each month. Your USDC balance will be deducted automatically. Cancel anytime.</p>
                </div>
              </label>

              {checkoutError && (
                <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,padding:10,marginBottom:12,fontSize:12,color:'#991B1B'}}>
                  {checkoutError}
                </div>
              )}

              {checkoutSuccess ? (
                <div style={{background:'#E6F9EE',border:'1px solid #BBF7D0',borderRadius:10,padding:14,textAlign:'center'}}>
                  <p style={{fontSize:15,fontWeight:700,color:'#166534'}}>Payment Successful!</p>
                  <p style={{fontSize:12,color:'#166534',marginTop:4}}>Redirecting to your dashboard...</p>
                </div>
              ) : (
                <>
                  <p style={{fontSize:12,color:'#8899A6',marginBottom:12}}>Pay with USDC on Base. Cancel anytime.</p>
                  <button
                    onClick={handleCheckout}
                    disabled={checkingOut || !hasSufficientBalance}
                    style={{width:'100%',padding:'14px',borderRadius:10,background:hasSufficientBalance ? '#0A66C2' : '#94A3B8',color:'#fff',fontSize:15,fontWeight:700,border:'none',cursor:hasSufficientBalance ? 'pointer' : 'not-allowed',fontFamily:'inherit',transition:'all .15s',opacity:checkingOut?0.6:1}}
                  >
                    {checkingOut ? "Processing..." : hasSufficientBalance ? `Pay ${formatCurrency(total)} USDC` : "Insufficient Balance"}
                  </button>
                </>
              )}
              <button
                onClick={() => router.push("/catalogue")}
                style={{width:'100%',padding:'10px',borderRadius:10,background:'transparent',color:'#536471',fontSize:13,fontWeight:500,border:'none',cursor:'pointer',fontFamily:'inherit',marginTop:8}}
              >
                Back to Browse
              </button>
            </div>
          </div>
        </div>

        {/* What Happens Next */}
        <div style={{marginTop:48}}>
          <h2 style={{fontSize:'clamp(20px,2.5vw,28px)',fontWeight:700,letterSpacing:'-0.02em',color:'#0F1419',marginBottom:8,fontFamily:"'Instrument Sans','DM Sans',system-ui,sans-serif"}}>
            What Happens Next
          </h2>
          <p style={{fontSize:14,color:'#536471',marginBottom:32}}>
            After checkout, here&apos;s how you&apos;ll get started with your accounts.
          </p>

          <div style={{display:'grid',gap:20,gridTemplateColumns:'repeat(3,1fr)'}}>
            {/* Step 1 */}
            <div style={{background:'#fff',border:'1px solid #E8E6E1',borderRadius:16,padding:28}}>
              <div style={{width:40,height:40,borderRadius:12,background:'#E8F1FA',color:'#0A66C2',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,fontFamily:"'Instrument Sans',sans-serif",marginBottom:16}}>1</div>
              <h3 style={{fontSize:17,fontWeight:700,color:'#0F1419',marginBottom:8,fontFamily:"'Instrument Sans',sans-serif"}}>Download the Klabber App</h3>
              <p style={{fontSize:13,color:'#536471',lineHeight:1.6}}>
                Download and install the Klabber desktop app. Your rented accounts will appear automatically inside the app, ready to use.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{background:'#fff',border:'1px solid #E8E6E1',borderRadius:16,padding:28}}>
              <div style={{width:40,height:40,borderRadius:12,background:'#E6F9EE',color:'#00B85C',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,fontFamily:"'Instrument Sans',sans-serif",marginBottom:16}}>2</div>
              <h3 style={{fontSize:17,fontWeight:700,color:'#0F1419',marginBottom:8,fontFamily:"'Instrument Sans',sans-serif"}}>Open Your Chrome Profiles</h3>
              <p style={{fontSize:13,color:'#536471',lineHeight:1.6}}>
                Each account opens as an isolated Chrome profile with its own digital fingerprint and dedicated residential proxy. This means you can access the LinkedIn account without it being flagged or restricted — it looks like normal, everyday usage.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{background:'#fff',border:'1px solid #E8E6E1',borderRadius:16,padding:28}}>
              <div style={{width:40,height:40,borderRadius:12,background:'#F3E8FF',color:'#7C3AED',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,fontFamily:"'Instrument Sans',sans-serif",marginBottom:16}}>3</div>
              <h3 style={{fontSize:17,fontWeight:700,color:'#0F1419',marginBottom:8,fontFamily:"'Instrument Sans',sans-serif"}}>Run Your Campaigns</h3>
              <p style={{fontSize:13,color:'#536471',lineHeight:1.6}}>
                Inside each Chrome profile, you have full access to run your outreach campaigns — connection requests, introduction messages, and open profile campaigns. You can also use Chrome extensions to help automate your workflows.
              </p>
            </div>
          </div>
        </div>

        {/* Campaign Types */}
        <div style={{marginTop:36}}>
          <h3 style={{fontSize:18,fontWeight:700,color:'#0F1419',marginBottom:16,fontFamily:"'Instrument Sans','DM Sans',system-ui,sans-serif"}}>
            Campaign Types You Can Run
          </h3>
          <div style={{display:'grid',gap:12,gridTemplateColumns:'repeat(3,1fr)'}}>
            {[
              {
                title: "Connection Campaigns",
                desc: "Send targeted connection requests to your ideal prospects. Build your network with decision-makers in your industry.",
                icon: "🤝",
              },
              {
                title: "Introduction Campaigns",
                desc: "Send personalised intro messages to new connections. Start conversations that convert into meetings and deals.",
                icon: "💬",
              },
              {
                title: "Open Profile Campaigns",
                desc: "Message LinkedIn members with open profiles directly — no connection required. Great for reaching senior executives.",
                icon: "📨",
              },
            ].map((c) => (
              <div key={c.title} style={{background:'#F3F2EE',borderRadius:12,padding:20}}>
                <div style={{fontSize:24,marginBottom:10}}>{c.icon}</div>
                <h4 style={{fontSize:14,fontWeight:700,color:'#0F1419',marginBottom:6}}>{c.title}</h4>
                <p style={{fontSize:12,color:'#536471',lineHeight:1.5}}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Automation Benefits */}
        <div style={{marginTop:36,background:'#fff',border:'1px solid #E8E6E1',borderRadius:16,padding:28}}>
          <h3 style={{fontSize:18,fontWeight:700,color:'#0F1419',marginBottom:6,fontFamily:"'Instrument Sans','DM Sans',system-ui,sans-serif"}}>
            Supercharge with Automation
          </h3>
          <p style={{fontSize:13,color:'#536471',marginBottom:20,lineHeight:1.6}}>
            Because each account runs inside a real Chrome browser, you can install any Chrome extension to automate and scale your outreach.
          </p>
          <div style={{display:'grid',gap:16,gridTemplateColumns:'1fr 1fr'}}>
            {[
              { title: "Save Hours Every Week", desc: "Automate repetitive tasks like sending connection requests, follow-ups, and profile visits." },
              { title: "Scale Your Outreach", desc: "Run campaigns across multiple accounts simultaneously — multiply your reach without multiplying your effort." },
              { title: "Personalise at Scale", desc: "Use automation tools that support dynamic personalisation so every message feels hand-written." },
              { title: "Track & Optimise", desc: "Monitor acceptance rates, reply rates, and campaign performance to continuously improve your results." },
            ].map((b) => (
              <div key={b.title} style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:20,height:20,borderRadius:'50%',background:'#E8F1FA',color:'#0A66C2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'#0F1419'}}>{b.title}</div>
                  <div style={{fontSize:12,color:'#536471',marginTop:2,lineHeight:1.5}}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
