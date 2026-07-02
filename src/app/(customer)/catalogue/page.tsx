"use client";

import { useEffect, useMemo, useState } from "react";
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
  linkedinVerified?: boolean;
  monthlyPrice: number;
  status: string;
  linkedinUrl: string | null;
  showcase?: boolean;
}

const POP = "var(--font-poppins)", INT = "var(--font-inter)", MONO = "var(--font-jbmono)";
const CALENDAR_URL = "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ1he_qAS5s8faJzrAIjTJi8KIX9xvPhGbC4Ipn38lPTLzkfSuoyMIiqUrB0viY2jpXr_W_zLSdq";

const AVATAR_COLORS = ["#0A66C2", "#0E7C74", "#5747C9", "#B23150", "#946011", "#067A45", "#0D1B2A", "#C2410C"];
const INDUSTRY_COLORS: Record<string, string> = { Sales: "#5747C9", Marketing: "#B23150", Technology: "#0A66C2", Operations: "#0E7C74", Finance: "#946011" };

function getAvatarColor(name: string) { return AVATAR_COLORS[(name.charCodeAt(0) + name.length) % AVATAR_COLORS.length]; }
function getInitials(name: string) { return name.replace(/\s*\(.*\)\s*$/, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase(); }
// Compact, uniform display name: "Tony Otto" -> "Tony O." (View Profile still links the full identity)
function shortName(name: string) { const p = name.replace(/\s*\(.*\)\s*$/, "").trim().split(/\s+/).filter(Boolean); return p.length < 2 ? (p[0] || "") : `${p[0]} ${p[p.length - 1][0].toUpperCase()}.`; }

const SORTS: Record<string, (a: Account, b: Account) => number> = {
  "conn-desc": (a, b) => b.connectionCount - a.connectionCount,
  "conn-asc": (a, b) => a.connectionCount - b.connectionCount,
  "price-asc": (a, b) => Number(a.monthlyPrice) - Number(b.monthlyPrice),
  "price-desc": (a, b) => Number(b.monthlyPrice) - Number(a.monthlyPrice),
};

export default function CataloguePage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [sort, setSort] = useState("conn-desc");
  const [hasSalesNav, setHasSalesNav] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [view, setView] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => { if (d.user) setUser(d.user); }).catch(() => {});
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (industry) params.set("industry", industry);
    if (hasSalesNav) params.set("hasSalesNav", "true");
    const res = await fetch(`/api/accounts?${params}`);
    const data = await res.json();
    setAccounts(data.accounts || []);
    setLoading(false);
  };

  useEffect(() => { fetchAccounts(); }, [hasSalesNav, industry]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchAccounts(); };
  const handleFilterClick = (f: string) => { setActiveFilter(f); setIndustry(f === "All" ? "" : f); };

  const toggleSelect = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const rentable = accounts.filter((a) => a.status === "available" && !a.showcase);
  const toggleSelectAll = () => setSelected(selected.size === rentable.length && rentable.length > 0 ? new Set() : new Set(rentable.map((a) => a.id)));

  const handleBulkRent = () => {
    if (selected.size === 0) return;
    if (!user) { router.push("/login?message=You must sign in or sign up before you can rent accounts."); return; }
    router.push(`/checkout?accounts=${Array.from(selected).join(",")}`);
  };
  const selectedTotal = accounts.filter((a) => selected.has(a.id)).reduce((s, a) => s + Number(a.monthlyPrice), 0);

  // rentable first, then showcase, then rented — chosen sort applied within each group
  const statusRank = (a: Account) => (a.status === "available" ? (a.showcase ? 1 : 0) : 2);
  const visible = useMemo(() => [...accounts].sort((a, b) => statusRank(a) - statusRank(b) || SORTS[sort](a, b)), [accounts, sort]);
  const availCount = rentable.length;

  const chip = (on: boolean) => ({ cursor: "pointer", font: `${on ? 600 : 500} 13.5px ${INT}`, color: on ? "#FFFFFF" : "#3F4856", background: on ? "#0B1220" : "#FFFFFF", border: "1px solid " + (on ? "#0B1220" : "#E0E3E9"), borderRadius: 999, padding: "9px 18px", transition: "all .15s" } as const);
  const seg = (on: boolean) => ({ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", font: `600 13px ${INT}`, color: on ? "#0B1220" : "#8A93A2", background: on ? "#FFFFFF" : "transparent", border: "none", borderRadius: 8, padding: "7px 14px", boxShadow: on ? "0 1px 2px rgba(16,24,40,0.12)" : "none" } as const);

  return (
    <div style={{ fontFamily: INT, color: "#0B1220", background: "#FBFCFD", minHeight: "100vh" }}>
      <style>{`
        .cat2-wrap{max-width:1220px;margin:0 auto;padding:0 40px;}
        .cat2-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}
        .cat2-card{transition:transform .2s cubic-bezier(.2,.7,.3,1), box-shadow .2s ease, border-color .2s ease;}
        .cat2-card:hover{transform:translateY(-5px);border-color:#0A66C2!important;box-shadow:0 18px 44px rgba(10,102,194,0.28), 0 6px 16px rgba(10,102,194,0.16), 0 0 0 1px rgba(10,102,194,0.25)!important;}
        .cat2-row:hover{background:#F8FAFC;}
        input::placeholder{color:#9AA4B2;}
        @media(max-width:1040px){.cat2-grid{grid-template-columns:1fr 1fr;}}
        @media(max-width:900px){.cat2-wrap{padding:0 18px;}.cat2-grid{grid-template-columns:1fr;}.cat2-listhead,.cat2-row{grid-template-columns:28px minmax(0,2.2fr) 1fr 1.4fr!important;}.cat2-hide{display:none!important;}}
      `}</style>

      {/* header */}
      <div className="cat2-wrap" style={{ paddingTop: 44 }}>
        <div style={{ font: `500 12px ${MONO}`, letterSpacing: "0.16em", textTransform: "uppercase", color: "#0A66C2", marginBottom: 14 }}>Marketplace</div>
        <h1 style={{ font: `700 clamp(30px,4vw,44px) ${POP}`, lineHeight: 1.05, letterSpacing: "-0.03em", margin: "0 0 12px" }}>Browse available accounts</h1>
        <p style={{ fontSize: 17, color: "#5A6473", margin: 0 }}>Verified, pre-warmed profiles — ready to rent right now.</p>
      </div>

      {/* controls */}
      <div className="cat2-wrap" style={{ paddingTop: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {["All", "Sales", "Marketing", "Technology", "Operations", "Finance"].map((c) => (
              <button key={c} onClick={() => handleFilterClick(c)} style={chip(activeFilter === c)}>{c}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => setHasSalesNav((v) => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", background: "#FFFFFF", border: "1px solid #E0E3E9", borderRadius: 10, padding: "9px 14px", font: `500 13.5px ${INT}`, color: "#3F4856" }}>
              <span style={{ width: 17, height: 17, borderRadius: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", font: `700 11px ${INT}`, color: "#fff", border: "1.5px solid " + (hasSalesNav ? "#0A66C2" : "#CBD2DB"), background: hasSalesNav ? "#0A66C2" : "#fff" }}>{hasSalesNav ? "✓" : ""}</span>
              Sales Navigator
            </button>
            <div style={{ position: "relative" }}>
              <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ appearance: "none", WebkitAppearance: "none", background: "#FFFFFF", border: "1px solid #E0E3E9", borderRadius: 10, padding: "10px 38px 10px 14px", font: `500 13.5px ${INT}`, color: "#3F4856", cursor: "pointer" }}>
                <option value="conn-desc">Most Connections</option>
                <option value="conn-asc">Fewest Connections</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
              <span style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#8A93A2", fontSize: 11 }}>▼</span>
            </div>
            <form onSubmit={handleSearch}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search accounts…" style={{ background: "#FFFFFF", border: "1px solid #E0E3E9", borderRadius: 10, padding: "10px 14px", font: `400 13.5px ${INT}`, color: "#0B1220", width: 210 }} />
            </form>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#8A93A2" }}>
            <span style={{ font: `500 13.5px ${MONO}`, color: "#0A66C2" }}>{visible.length}</span> accounts match
            <span style={{ font: `600 12px ${INT}`, color: "#067A45", background: "#E4F6EC", borderRadius: 999, padding: "3px 10px", marginLeft: 4 }}>{availCount} available now</span>
          </div>
          <div style={{ display: "inline-flex", background: "#EEF1F5", borderRadius: 10, padding: 3, gap: 2 }}>
            <button onClick={() => setView("list")} style={seg(view === "list")}>▤ List</button>
            <button onClick={() => setView("grid")} style={seg(view === "grid")}>▦ Grid</button>
          </div>
        </div>
      </div>

      {/* bulk-rent bar */}
      {selected.size > 0 && (
        <div className="cat2-wrap" style={{ marginTop: 16 }}>
          <div style={{ background: "#0A66C2", borderRadius: 12, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{selected.size} account{selected.size > 1 ? "s" : ""} selected</span>
              <span style={{ fontSize: 13, opacity: 0.85 }}>Total: {formatCurrency(selectedTotal)}/mo</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setSelected(new Set())} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: INT }}>Clear</button>
              <button onClick={handleBulkRent} style={{ padding: "6px 18px", borderRadius: 8, border: "none", background: "#fff", color: "#0A66C2", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: INT }}>Rent {selected.size} Account{selected.size > 1 ? "s" : ""}</button>
            </div>
          </div>
        </div>
      )}

      {/* body */}
      <div className="cat2-wrap" style={{ paddingTop: 22, paddingBottom: 8 }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} style={{ height: 60, borderRadius: 14, background: "#EAECEF", animation: "pulse 1.5s ease-in-out infinite" }} />)}</div>
        ) : accounts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#5A6473" }}>
            <p style={{ fontSize: 16, fontWeight: 500 }}>No accounts match your filters.</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>Try clearing a filter or check back soon.</p>
          </div>
        ) : view === "grid" ? (
          <div className="cat2-grid">
            {visible.map((a) => <GridCard key={a.id} a={a} selected={selected.has(a.id)} onToggle={toggleSelect} />)}
          </div>
        ) : (
          <div style={{ background: "#FFFFFF", border: "1px solid #E9ECF0", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}>
            <div className="cat2-listhead" style={{ display: "grid", gridTemplateColumns: "28px minmax(0,2.4fr) 0.9fr 1.1fr 1.3fr 0.8fr 1fr 1.6fr", alignItems: "center", gap: 16, padding: "14px 22px", background: "#F8FAFC", borderBottom: "1px solid #EDEFF2", font: `500 11px ${MONO}`, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8A93A2" }}>
              <input type="checkbox" checked={selected.size > 0 && selected.size === rentable.length} onChange={toggleSelectAll} style={{ accentColor: "#0A66C2", cursor: "pointer" }} />
              <span>Profile</span><span className="cat2-hide">Connections</span><span className="cat2-hide">Industry</span><span className="cat2-hide">Location</span><span className="cat2-hide">Sales Nav</span><span>Price</span><span></span>
            </div>
            {visible.map((a) => <ListRow key={a.id} a={a} selected={selected.has(a.id)} onToggle={toggleSelect} />)}
          </div>
        )}
      </div>

      {/* logged-out gate */}
      {!loading && !user && (
        <div className="cat2-wrap" style={{ marginTop: 24 }}>
          <div style={{ background: "#fff", border: "1px solid #E9ECF0", borderRadius: 16, padding: "28px 32px", textAlign: "center" }}>
            <h3 style={{ font: `700 20px ${POP}`, color: "#0B1220", marginBottom: 6 }}>Ready to rent?</h3>
            <p style={{ fontSize: 14, color: "#5A6473", marginBottom: 18, maxWidth: 460, margin: "0 auto 18px", lineHeight: 1.5 }}>Create a free account to rent any of these profiles — it only takes a minute.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/register" style={{ padding: "11px 22px", borderRadius: 10, background: "#0A66C2", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Create free account</Link>
              <Link href="/login" style={{ padding: "11px 22px", borderRadius: 10, background: "#EEF1F5", color: "#0B1220", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
            </div>
          </div>
        </div>
      )}

      {/* dark CTA */}
      {!loading && accounts.length > 0 && (
        <div className="cat2-wrap" style={{ marginTop: 36, paddingBottom: 64 }}>
          <div style={{ background: "radial-gradient(130% 150% at 12% 0%, #12305F 0%, #0A1826 65%)", borderRadius: 20, padding: "40px 44px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 28, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 560 }}>
              <div style={{ font: `500 11px ${MONO}`, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7FA8E0", marginBottom: 10 }}>Need a hand?</div>
              <div style={{ font: `700 27px ${POP}`, color: "#fff", marginBottom: 8, letterSpacing: "-0.01em" }}>Looking for something specific?</div>
              <p style={{ fontSize: 15.5, lineHeight: 1.55, color: "#AFC0D6", margin: 0 }}>Book a quick call and we&apos;ll match you to the right account for your campaign.</p>
            </div>
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#fff", color: "#0B1220", fontSize: 15, fontWeight: 600, padding: "14px 24px", borderRadius: 12, whiteSpace: "nowrap", textDecoration: "none" }}>Book a Meeting →</a>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}

function StatusBadge({ rented }: { rented: boolean }) {
  return (
    <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, borderRadius: 999, padding: "4px 11px", color: rented ? "#946011" : "#067A45", background: rented ? "#FBF0DA" : "#E4F6EC" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: rented ? "#E0A43B" : "#00B85C" }} />{rented ? "Rented" : "Available"}
    </span>
  );
}

function Verified() {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 600, color: "#0A66C2", background: "#EAF2FC", borderRadius: 6, padding: "2px 7px" }}>✓ Verified</span>;
}

function IndustryTag({ industry }: { industry: string }) {
  const c = INDUSTRY_COLORS[industry] || "#0A66C2";
  return <span style={{ font: `500 11px ${MONO}`, letterSpacing: "0.04em", color: c, background: c + "14", borderRadius: 6, padding: "4px 9px" }}>{industry}</span>;
}

function Actions({ a }: { a: Account }) {
  const isAvailable = a.status === "available";
  const viewStyle = { fontSize: 13, fontWeight: 600, color: "#0A66C2", background: "#EAF2FC", borderRadius: 9, padding: "9px 13px", textDecoration: "none", whiteSpace: "nowrap" } as const;
  return (
    <>
      {a.linkedinUrl ? (
        <a href={a.linkedinUrl.startsWith("http") ? a.linkedinUrl : `https://${a.linkedinUrl}`} target="_blank" rel="noopener noreferrer" style={viewStyle}>View</a>
      ) : !a.showcase ? (
        <Link href={`/account/${a.id}`} style={viewStyle}>View</Link>
      ) : null}
      {isAvailable ? (
        a.showcase ? (
          <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: "#00A150", borderRadius: 9, padding: "9px 15px", textDecoration: "none", whiteSpace: "nowrap" }}>Book a call</a>
        ) : (
          <Link href={`/account/${a.id}`} style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: "#00A150", borderRadius: 9, padding: "9px 17px", textDecoration: "none", whiteSpace: "nowrap" }}>Rent</Link>
        )
      ) : (
        <span style={{ fontSize: 13, fontWeight: 600, color: "#96A0AD", background: "#F2F4F7", borderRadius: 9, padding: "9px 15px", whiteSpace: "nowrap" }}>Rented</span>
      )}
    </>
  );
}

function Avatar({ a, rented }: { a: Account; rented: boolean }) {
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <span style={{ width: 46, height: 46, borderRadius: "50%", background: getAvatarColor(a.linkedinName), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: `600 15px ${POP}`, overflow: "hidden", filter: rented ? "grayscale(0.5)" : "none" }}>
        {a.profilePhotoUrl ? <img src={a.profilePhotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : getInitials(a.linkedinName)}
      </span>
      <span style={{ position: "absolute", bottom: 1, right: 1, width: 12, height: 12, borderRadius: "50%", border: "2px solid #fff", background: rented ? "#E0A43B" : "#00B85C" }} />
    </div>
  );
}

function GridCard({ a, selected, onToggle }: { a: Account; selected: boolean; onToggle: (id: string) => void }) {
  const rented = a.status !== "available";
  const rentable = a.status === "available" && !a.showcase;
  const displayName = shortName(a.linkedinName);
  return (
    <div className="cat2-card" style={{ position: "relative", background: "#FFFFFF", border: "1px solid #DFE3E9", borderRadius: 16, padding: 20, boxShadow: "0 8px 24px rgba(16,24,40,0.07), 0 1px 3px rgba(16,24,40,0.05)", opacity: rented ? 0.72 : 1, display: "flex", flexDirection: "column" }}>
      {rentable && (
        <input type="checkbox" checked={selected} onChange={() => onToggle(a.id)} title="Select for bulk rent" style={{ position: "absolute", top: 16, right: 16, accentColor: "#0A66C2", cursor: "pointer", width: 16, height: 16 }} />
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 13, marginBottom: 16 }}>
        <Avatar a={a} rented={rented} />
        <div style={{ minWidth: 0, flex: 1, paddingRight: rentable ? 20 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ font: `600 16px ${POP}`, color: "#0B1220", lineHeight: 1.2 }}>{displayName}</span>
            {a.linkedinVerified && <Verified />}
          </div>
          {a.linkedinHeadline && <div style={{ fontSize: 13, color: "#8A93A2", marginTop: 3, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{a.linkedinHeadline}</div>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {a.industry && <IndustryTag industry={a.industry} />}
        {a.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#5A6473" }}><span style={{ color: "#B0B7C2" }}>◍</span>{a.location}</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 18 }}>
        <div style={{ background: "#F8FAFC", border: "1px solid #EDEFF2", borderRadius: 10, padding: "11px 13px" }}>
          <div style={{ font: `700 16px ${POP}`, color: "#0B1220" }}>{a.connectionCount > 0 ? formatNumber(a.connectionCount) : "—"}</div>
          <div style={{ fontSize: 11, color: "#96A0AD", marginTop: 2 }}>connections</div>
        </div>
        <div style={{ background: "#F8FAFC", border: "1px solid #EDEFF2", borderRadius: 10, padding: "11px 13px" }}>
          <div style={{ font: `700 15px ${POP}`, color: a.hasSalesNav ? "#00A150" : "#C2C9D2" }}>{a.hasSalesNav ? "✓ Yes" : "— No"}</div>
          <div style={{ fontSize: 11, color: "#96A0AD", marginTop: 2 }}>Sales Navigator</div>
        </div>
      </div>
      <div style={{ height: 1, background: "#EDEFF2", marginBottom: 14 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div><span style={{ font: `700 19px ${POP}`, color: "#0B1220" }}>{formatCurrency(Number(a.monthlyPrice))}</span><span style={{ fontSize: 13, color: "#96A0AD" }}>/mo</span></div>
        <div style={{ display: "flex", gap: 8 }}><Actions a={a} /></div>
      </div>
    </div>
  );
}

function ListRow({ a, selected, onToggle }: { a: Account; selected: boolean; onToggle: (id: string) => void }) {
  const rented = a.status !== "available";
  const rentable = a.status === "available" && !a.showcase;
  const displayName = shortName(a.linkedinName);
  return (
    <div className="cat2-row" style={{ display: "grid", gridTemplateColumns: "28px minmax(0,2.4fr) 0.9fr 1.1fr 1.3fr 0.8fr 1fr 1.6fr", alignItems: "center", gap: 16, padding: "15px 22px", borderBottom: "1px solid #F0F2F5", opacity: rented ? 0.66 : 1, background: selected ? "#F0F7FF" : "transparent", transition: "background .15s" }}>
      {rentable ? <input type="checkbox" checked={selected} onChange={() => onToggle(a.id)} style={{ accentColor: "#0A66C2", cursor: "pointer" }} /> : <input type="checkbox" disabled style={{ opacity: 0.3 }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
        <Avatar a={a} rented={rented} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ font: `600 15px ${POP}`, color: "#0B1220", lineHeight: 1.2 }}>{displayName}</span>
            {a.linkedinVerified && <Verified />}
          </div>
          {a.linkedinHeadline && <div style={{ fontSize: 12.5, color: "#8A93A2", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.linkedinHeadline}</div>}
        </div>
      </div>
      <span className="cat2-hide" style={{ font: `700 15px ${POP}`, color: "#0B1220" }}>{a.connectionCount > 0 ? formatNumber(a.connectionCount) : "—"}</span>
      <span className="cat2-hide">{a.industry ? <IndustryTag industry={a.industry} /> : "—"}</span>
      <span className="cat2-hide" style={{ fontSize: 13, color: "#5A6473", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.location || "—"}</span>
      <span className="cat2-hide" style={{ width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: a.hasSalesNav ? "#067A45" : "#C23150", background: a.hasSalesNav ? "#E4F6EC" : "#FBE7EB" }}>{a.hasSalesNav ? "✓" : "✕"}</span>
      <span><span style={{ font: `700 15px ${POP}`, color: "#0B1220" }}>{formatCurrency(Number(a.monthlyPrice))}</span><span style={{ fontSize: 12, color: "#96A0AD" }}>/mo</span></span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}><StatusBadge rented={rented} /><Actions a={a} /></div>
    </div>
  );
}
