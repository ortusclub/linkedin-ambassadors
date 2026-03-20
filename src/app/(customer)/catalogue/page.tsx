"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatNumber, formatCurrency } from "@/lib/utils";

interface Account {
  id: string;
  linkedinName: string;
  linkedinHeadline: string | null;
  connectionCount: number;
  industry: string | null;
  location: string | null;
  profilePhotoUrl: string | null;
  accountAgeMonths: number | null;
  hasSalesNav: boolean;
  monthlyPrice: number;
  status: string;
  linkedinUrl: string | null;
}

const AVATAR_COLORS = [
  "linear-gradient(135deg,#0A66C2,#004182)",
  "linear-gradient(135deg,#00B85C,#007A3D)",
  "linear-gradient(135deg,#7C3AED,#5B21B6)",
  "linear-gradient(135deg,#DC2626,#991B1B)",
  "linear-gradient(135deg,#D97706,#92400E)",
  "linear-gradient(135deg,#0891B2,#155E75)",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.replace(/\s*\(.*\)\s*$/, "").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function CataloguePage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [sort, setSort] = useState("connectionCount");
  const [hasSalesNav, setHasSalesNav] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => {
      if (data.user) setUser(data.user);
    }).catch(() => {});
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (industry) params.set("industry", industry);
    if (sort) params.set("sort", sort);
    if (hasSalesNav) params.set("hasSalesNav", "true");

    const res = await fetch(`/api/accounts?${params}`);
    const data = await res.json();
    setAccounts(data.accounts || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, [sort, hasSalesNav]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAccounts();
  };

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    if (filter === "All") {
      setIndustry("");
    } else {
      setIndustry(filter);
    }
    setTimeout(() => fetchAccounts(), 0);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const available = accounts.filter((a) => a.status === "available");
    if (selected.size === available.length && available.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(available.map((a) => a.id)));
    }
  };

  const handleBulkRent = () => {
    if (selected.size === 0) return;
    if (!user) {
      router.push("/login?message=You must sign in or sign up before you can rent accounts.");
      return;
    }
    router.push(`/checkout?accounts=${Array.from(selected).join(",")}`);
  };

  const selectedTotal = accounts
    .filter((a) => selected.has(a.id))
    .reduce((sum, a) => sum + Number(a.monthlyPrice), 0);

  const handleRentSingle = (accountId: string) => {
    if (!user) {
      router.push("/login?message=You must sign in or sign up before you can rent accounts.");
      return;
    }
    router.push(`/checkout?accounts=${accountId}`);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap');
        .cat-page{font-family:'DM Sans','Instrument Sans',system-ui,sans-serif;background:#FAFAF8;min-height:100vh;-webkit-font-smoothing:antialiased}
        .cat-page h1,.cat-page h2,.cat-page h3,.cat-page h4{font-family:'Instrument Sans','DM Sans',system-ui,sans-serif;font-weight:600;letter-spacing:-0.02em}
        .cat-inner{max-width:1200px;margin:0 auto;padding:40px 40px 80px}
        .cat-header{margin-bottom:32px}
        .cat-label{font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#0A66C2;margin-bottom:12px}
        .cat-title{font-size:clamp(28px,3.5vw,42px);line-height:1.15;letter-spacing:-0.03em;margin-bottom:8px;color:#0F1419}
        .cat-subtitle{font-size:14px;color:#536471}
        .cat-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:32px;flex-wrap:wrap}
        .cat-filters{display:flex;gap:8px;flex-wrap:wrap}
        .cat-chip{padding:8px 16px;border-radius:100px;font-size:13px;font-weight:500;border:1px solid #E8E6E1;background:#FFFFFF;color:#536471;cursor:pointer;transition:all .15s;font-family:'DM Sans',system-ui,sans-serif}
        .cat-chip:hover,.cat-chip.active{background:#1D1B16;color:#fff;border-color:#1D1B16}
        .cat-search{display:flex;gap:8px;align-items:center}
        .cat-search input{padding:8px 16px;border-radius:10px;border:1px solid #E8E6E1;font-size:13px;font-family:'DM Sans',system-ui,sans-serif;background:#fff;color:#0F1419;outline:none;width:240px;transition:border-color .15s}
        .cat-search input:focus{border-color:#0A66C2}
        .cat-search button{padding:8px 20px;border-radius:10px;background:#0A66C2;color:#fff;font-size:13px;font-weight:600;border:none;cursor:pointer;font-family:'DM Sans',system-ui,sans-serif;transition:all .15s}
        .cat-search button:hover{background:#004182}
        .cat-sort{padding:8px 12px;border-radius:10px;border:1px solid #E8E6E1;font-size:13px;font-family:'DM Sans',system-ui,sans-serif;background:#fff;color:#536471;outline:none;cursor:pointer}
        .cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
        .cat-card{background:#FFFFFF;border:1px solid #E8E6E1;border-radius:16px;padding:24px;transition:all .2s;cursor:pointer;position:relative;text-decoration:none;color:inherit;display:block}
        .cat-card:hover{border-color:#0A66C2;box-shadow:0 8px 24px rgba(10,102,194,0.08);transform:translateY(-2px)}
        .cat-card-header{display:flex;align-items:center;gap:14px;margin-bottom:16px}
        .cat-avatar{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff;flex-shrink:0;overflow:hidden}
        .cat-avatar img{width:100%;height:100%;object-fit:cover}
        .cat-name{font-weight:600;font-size:15px;margin-bottom:2px;color:#0F1419}
        .cat-role{font-size:13px;color:#536471;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px}
        .cat-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
        .cat-meta-item{background:#F3F2EE;padding:8px 12px;border-radius:8px}
        .cat-meta-item .val{font-size:15px;font-weight:600;font-family:'Instrument Sans',sans-serif;color:#0F1419}
        .cat-meta-item .lbl{font-size:11px;color:#8899A6;margin-top:1px}
        .cat-tags{display:flex;gap:6px;flex-wrap:wrap}
        .cat-tag{font-size:11px;padding:4px 10px;border-radius:100px;background:#E8F1FA;color:#0A66C2;font-weight:500}
        .cat-price-row{margin-top:16px;padding-top:16px;border-top:1px solid #E8E6E1;display:flex;align-items:baseline;justify-content:space-between}
        .cat-price{font-size:22px;font-weight:700;font-family:'Instrument Sans',sans-serif;letter-spacing:-0.02em;color:#0F1419}
        .cat-period{font-size:13px;color:#8899A6}
        .cat-view-btn{padding:4px 10px;border-radius:6px;background:#0A66C2;color:#fff;font-size:11px;font-weight:600;border:none;cursor:pointer;transition:all .15s;font-family:'DM Sans',system-ui,sans-serif;white-space:nowrap}
        .cat-view-btn:hover{background:#004182}
        .cat-rent-btn{padding:4px 10px;border-radius:6px;background:#00B85C;color:#fff;font-size:11px;font-weight:600;border:none;cursor:pointer;transition:all .15s;font-family:'DM Sans',system-ui,sans-serif;white-space:nowrap}
        .cat-rent-btn:hover{background:#007A3D}
        .cat-rent-btn:disabled{opacity:0.5;cursor:not-allowed}
        .cat-empty{grid-column:1/-1;text-align:center;padding:60px 20px;color:#536471}
        .cat-loading{height:200px;border-radius:16px;background:#E8E6E1;animation:pulse 1.5s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .cat-nav-check{display:flex;align-items:center;gap:8px;font-size:13px;color:#536471;font-family:'DM Sans',system-ui,sans-serif;cursor:pointer;font-weight:500}
        .cat-nav-check input{accent-color:#0A66C2}
        @media(max-width:900px){
          .cat-inner{padding:24px 16px 60px}
          .cat-toolbar{flex-direction:column;align-items:stretch}
          .cat-search input{width:100%}
          .cat-grid{grid-template-columns:1fr}
        }
      `}</style>
      <div className="cat-page">
        <div className="cat-inner">
          <div className="cat-header">
            <div className="cat-label">Marketplace</div>
            <h1 className="cat-title">Browse available accounts</h1>
            <p className="cat-subtitle">{accounts.length} accounts ready to rent right now</p>
          </div>

          <div className="cat-toolbar">
            <div className="cat-filters">
              {["All", "Technology", "Finance", "Healthcare", "Marketing", "Sales"].map(f => (
                <span
                  key={f}
                  className={`cat-chip ${activeFilter === f ? "active" : ""}`}
                  onClick={() => handleFilterClick(f)}
                >
                  {f}
                </span>
              ))}
            </div>
            <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
              <label className="cat-nav-check">
                <input
                  type="checkbox"
                  checked={hasSalesNav}
                  onChange={(e) => setHasSalesNav(e.target.checked)}
                />
                Sales Navigator
              </label>
              <select className="cat-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="connectionCount">Most Connections</option>
                <option value="accountAge">Account Age</option>
                <option value="newest">Newest Added</option>
              </select>
              <form onSubmit={handleSearch} className="cat-search">
                <input
                  placeholder="Search accounts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button type="submit">Search</button>
              </form>
            </div>
          </div>

          {/* Bulk rent bar */}
          {selected.size > 0 && (
            <div style={{background:'#0A66C2',borderRadius:12,padding:'12px 20px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',color:'#fff'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontWeight:600,fontSize:14}}>{selected.size} account{selected.size > 1 ? 's' : ''} selected</span>
                <span style={{fontSize:13,opacity:0.85}}>Total: {formatCurrency(selectedTotal)}/mo</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <button
                  onClick={() => setSelected(new Set())}
                  style={{padding:'6px 14px',borderRadius:8,border:'1px solid rgba(255,255,255,0.3)',background:'transparent',color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}
                >
                  Clear
                </button>
                <button
                  onClick={handleBulkRent}
                  style={{padding:'6px 18px',borderRadius:8,border:'none',background:'#fff',color:'#0A66C2',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}
                >
                  {`Rent ${selected.size} Account${selected.size > 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {[1,2,3,4,5,6].map(i => <div key={i} className="cat-loading" style={{height:56}} />)}
            </div>
          ) : accounts.length === 0 ? (
            <div className="cat-empty">
              <p style={{fontSize:16,fontWeight:500}}>No accounts available right now.</p>
              <p style={{fontSize:14,marginTop:8}}>Check back soon or adjust your filters.</p>
            </div>
          ) : (
            <div style={{background:'#fff',border:'1px solid #E8E6E1',borderRadius:16,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
                <thead>
                  <tr style={{borderBottom:'1px solid #E8E6E1',textAlign:'left',fontSize:12,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',color:'#8899A6'}}>
                    <th style={{padding:'12px 12px 12px 16px',width:40}}>
                      <input
                        type="checkbox"
                        checked={selected.size > 0 && selected.size === accounts.filter(a => a.status === 'available').length}
                        onChange={toggleSelectAll}
                        style={{accentColor:'#0A66C2',cursor:'pointer'}}
                      />
                    </th>
                    <th style={{padding:'12px 16px'}}>Profile</th>
                    <th style={{padding:'12px 16px'}}>Connections</th>
                    <th style={{padding:'12px 16px'}}>Industry</th>
                    <th style={{padding:'12px 16px'}}>Location</th>
                    <th style={{padding:'12px 16px'}}>Account Age</th>
                    <th style={{padding:'12px 16px'}}>Sales Nav</th>
                    <th style={{padding:'12px 16px'}}>Status</th>
                    <th style={{padding:'12px 16px'}}>Price</th>
                    <th style={{padding:'12px 16px'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => {
                    const displayName = a.linkedinName.replace(/\s*\(.*\)\s*$/, "");
                    const initials = getInitials(a.linkedinName);
                    const ageYears = a.accountAgeMonths ? Math.floor(a.accountAgeMonths / 12) : null;
                    const price = Number(a.monthlyPrice);
                    const isAvailable = a.status === 'available';
                    const isSelected = selected.has(a.id);
                    const statusColors: Record<string, {bg:string,text:string,dot:string}> = {
                      available: {bg:'#E6F9EE',text:'#007A3D',dot:'#00B85C'},
                      rented: {bg:'#FEF3C7',text:'#92400E',dot:'#D97706'},
                      maintenance: {bg:'#E8F1FA',text:'#004182',dot:'#0A66C2'},
                      retired: {bg:'#F3F2EE',text:'#536471',dot:'#8899A6'},
                    };
                    const sc = statusColors[a.status] || statusColors.retired;
                    return (
                      <tr
                        key={a.id}
                        style={{borderBottom:'1px solid #F0EFEB',transition:'background .15s',cursor:'pointer',background:isSelected?'#F0F7FF':'transparent'}}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background='#FAFAF8'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background='transparent'; }}
                      >
                        <td style={{padding:'12px 12px 12px 16px',width:40}}>
                          {isAvailable ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(a.id)}
                              style={{accentColor:'#0A66C2',cursor:'pointer'}}
                            />
                          ) : (
                            <input type="checkbox" disabled style={{opacity:0.3}} />
                          )}
                        </td>
                        <td style={{padding:'12px 16px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:12}}>
                            <div className="cat-avatar" style={{background: getAvatarColor(a.linkedinName),width:36,height:36,borderRadius:9,fontSize:13}}>
                              {a.profilePhotoUrl ? (
                                <img src={a.profilePhotoUrl} alt={displayName} />
                              ) : initials}
                            </div>
                            <div>
                              <div style={{fontWeight:600,color:'#0F1419'}}>{displayName}</div>
                              {a.linkedinHeadline && <div style={{fontSize:12,color:'#8899A6',maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.linkedinHeadline}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{padding:'12px 16px',color:'#0F1419',fontWeight:500}}>{a.connectionCount > 0 ? formatNumber(a.connectionCount) : '—'}</td>
                        <td style={{padding:'12px 16px',color:'#536471'}}>{a.industry || '—'}</td>
                        <td style={{padding:'12px 16px',color:'#536471'}}>{a.location || '—'}</td>
                        <td style={{padding:'12px 16px',color:'#536471'}}>{ageYears && ageYears > 0 ? `${ageYears}+ yrs` : '—'}</td>
                        <td style={{padding:'12px 16px',textAlign:'center'}}>
                          {a.hasSalesNav ? (
                            <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:20,height:20,borderRadius:'50%',background:'#E6F9EE',color:'#00B85C'}}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                            </span>
                          ) : (
                            <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:20,height:20,borderRadius:'50%',background:'#FEF2F2',color:'#DC2626'}}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </span>
                          )}
                        </td>
                        <td style={{padding:'12px 16px'}}>
                          <span style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',borderRadius:100,fontSize:12,fontWeight:600,background:sc.bg,color:sc.text}}>
                            <span style={{width:6,height:6,borderRadius:'50%',background:sc.dot}} />
                            {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                          </span>
                        </td>
                        <td style={{padding:'12px 16px',fontWeight:700,color:'#0F1419',whiteSpace:'nowrap'}}>{formatCurrency(price)}<span style={{fontWeight:400,color:'#8899A6',fontSize:12}}>/mo</span></td>
                        <td style={{padding:'12px 16px',textAlign:'right'}}>
                          <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                            {a.linkedinUrl ? (
                              <a href={a.linkedinUrl} target="_blank" rel="noopener noreferrer" className="cat-view-btn" style={{display:'inline-block',textDecoration:'none'}}>View Profile</a>
                            ) : (
                              <Link href={`/account/${a.id}`} className="cat-view-btn" style={{display:'inline-block',textDecoration:'none'}}>View Profile</Link>
                            )}
                            {isAvailable && (
                              <button
                                className="cat-rent-btn"
                                onClick={() => handleRentSingle(a.id)}
                              >
                                Rent
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
