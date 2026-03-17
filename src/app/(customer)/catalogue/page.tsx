"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [sort, setSort] = useState("connectionCount");
  const [hasSalesNav, setHasSalesNav] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

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
        .cat-view-btn{padding:8px 18px;border-radius:10px;background:#0A66C2;color:#fff;font-size:13px;font-weight:600;border:none;cursor:pointer;transition:all .15s;font-family:'DM Sans',system-ui,sans-serif}
        .cat-view-btn:hover{background:#004182;transform:translateY(-1px)}
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

          {loading ? (
            <div className="cat-grid">
              {[1,2,3,4,5,6].map(i => <div key={i} className="cat-loading" />)}
            </div>
          ) : accounts.length === 0 ? (
            <div className="cat-empty">
              <p style={{fontSize:16,fontWeight:500}}>No accounts available right now.</p>
              <p style={{fontSize:14,marginTop:8}}>Check back soon or adjust your filters.</p>
            </div>
          ) : (
            <div className="cat-grid">
              {accounts.map((a) => {
                const displayName = a.linkedinName.replace(/\s*\(.*\)\s*$/, "");
                const initials = getInitials(a.linkedinName);
                const ageYears = a.accountAgeMonths ? Math.floor(a.accountAgeMonths / 12) : null;
                const price = Number(a.monthlyPrice);
                return (
                  <Link key={a.id} href={`/account/${a.id}`} className="cat-card">
                    <div className="cat-card-header">
                      <div className="cat-avatar" style={{background: getAvatarColor(a.linkedinName)}}>
                        {a.profilePhotoUrl ? (
                          <img src={a.profilePhotoUrl} alt={displayName} />
                        ) : initials}
                      </div>
                      <div style={{minWidth:0}}>
                        <div className="cat-name">{displayName}</div>
                        <div className="cat-role">{a.linkedinHeadline || [a.industry, a.location].filter(Boolean).join(" · ") || ""}</div>
                      </div>
                    </div>
                    <div className="cat-meta">
                      {a.connectionCount > 0 && (
                        <div className="cat-meta-item"><div className="val">{formatNumber(a.connectionCount)}</div><div className="lbl">Connections</div></div>
                      )}
                      {ageYears && ageYears > 0 ? (
                        <div className="cat-meta-item"><div className="val">{ageYears}+ yrs</div><div className="lbl">Account age</div></div>
                      ) : null}
                      {a.hasSalesNav && (
                        <div className="cat-meta-item"><div className="val">SN</div><div className="lbl">Sales Nav included</div></div>
                      )}
                    </div>
                    <div className="cat-tags">
                      {a.industry && <span className="cat-tag">{a.industry}</span>}
                      {a.location && <span className="cat-tag">{a.location}</span>}
                    </div>
                    <div className="cat-price-row">
                      <div><span className="cat-price">{formatCurrency(price)}</span><span className="cat-period">/month</span></div>
                      <span className="cat-view-btn">View Profile</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
