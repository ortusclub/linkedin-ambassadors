"use client";

import { useState } from "react";

const TEST_ACCOUNT_URL = "https://g.camp/share/tau%40ortus.solutions/34I33be7FS";

export function TestAccountGate() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await fetch("/api/leads/test-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      window.open(TEST_ACCOUNT_URL, "_blank", "noopener,noreferrer");
      setOpen(false);
      setName("");
      setEmail("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:10,marginTop:28,padding:'18px 36px',background:'linear-gradient(135deg, #FF6B00, #FF8C33)',color:'white',borderRadius:14,fontSize:17,fontWeight:700,border:'none',cursor:'pointer',boxShadow:'0 4px 14px rgba(255,107,0,0.35)',transition:'transform 0.2s, box-shadow 0.2s',fontFamily:'inherit'}}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Try Our Test Account
      </button>

      {open && (
        <div
          onClick={() => !submitting && setOpen(false)}
          style={{position:'fixed',inset:0,background:'rgba(15,20,25,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{background:'#fff',borderRadius:20,maxWidth:440,width:'100%',padding:32,boxShadow:'0 24px 60px rgba(15,20,25,0.25)',fontFamily:"'DM Sans','Instrument Sans',system-ui,sans-serif",textAlign:'left'}}
          >
            <div style={{width:56,height:56,borderRadius:16,background:'#FFF4E5',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </div>
            <h2 style={{fontSize:22,fontWeight:700,color:'#0F1419',letterSpacing:'-0.02em',marginBottom:8,fontFamily:"'Instrument Sans','DM Sans',system-ui,sans-serif"}}>
              Try our test account
            </h2>
            <p style={{fontSize:14,color:'#536471',lineHeight:1.55,marginBottom:20}}>
              Enter your details and we&apos;ll open a live LinkedIn account in your browser — no password, no setup.
            </p>
            <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'#0F1419',marginBottom:6}}>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  disabled={submitting}
                  style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'1px solid #E8E6E1',fontSize:14,fontFamily:'inherit',color:'#0F1419',outline:'none',background:'#fff'}}
                />
              </div>
              <div>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'#0F1419',marginBottom:6}}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  disabled={submitting}
                  style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'1px solid #E8E6E1',fontSize:14,fontFamily:'inherit',color:'#0F1419',outline:'none',background:'#fff'}}
                />
              </div>
              {error && (
                <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,padding:10,fontSize:12,color:'#991B1B'}}>{error}</div>
              )}
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                  style={{flex:1,padding:'13px',borderRadius:10,background:'#fff',color:'#536471',fontSize:14,fontWeight:600,border:'1px solid #E8E6E1',cursor:submitting?'not-allowed':'pointer',fontFamily:'inherit'}}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{flex:1.4,padding:'13px',borderRadius:10,background:'#FF6B00',color:'#fff',fontSize:14,fontWeight:700,border:'none',cursor:submitting?'wait':'pointer',fontFamily:'inherit',opacity:submitting?0.7:1}}
                >
                  {submitting ? "Opening..." : "Open Test Account →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
