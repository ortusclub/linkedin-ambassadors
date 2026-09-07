"use client";

import { useEffect, useMemo, useState } from "react";

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";

interface DiscountCode {
  id: string;
  code: string;
  active: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: number | null;
  created: number;
  discountType: "percent" | "fixed";
  percentOff: number | null;
  amountOff: number | null;
  duration: string;
  durationInMonths: number | null;
  couponValid: boolean;
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (ts: number) => { const d = new Date(ts * 1000); return `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
const discountLabel = (c: DiscountCode) =>
  c.discountType === "percent" ? `${c.percentOff}% off` : `$${(c.amountOff ?? 0).toFixed(2)} off`;
const durationLabel = (c: DiscountCode) =>
  c.duration === "forever" ? "every month" : c.duration === "repeating" ? `${c.durationInMonths} months` : "first month";

export default function AdminDiscountsPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    code: "",
    discountType: "percent" as "percent" | "fixed",
    value: "",
    duration: "once" as "once" | "forever" | "repeating",
    durationInMonths: "3",
    expiresAt: "",
    maxRedemptions: "",
  });

  const load = () => {
    setLoading(true);
    fetch("/api/admin/discounts")
      .then((r) => r.json())
      .then((d) => setCodes(d.codes || []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          discountType: form.discountType,
          value: Number(form.value),
          duration: form.duration,
          durationInMonths: Number(form.durationInMonths),
          expiresAt: form.expiresAt || undefined,
          maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not create code"); return; }
      setShowForm(false);
      setForm({ code: "", discountType: "percent", value: "", duration: "once", durationInMonths: "3", expiresAt: "", maxRedemptions: "" });
      load();
    } catch { setError("Something went wrong. Please try again."); }
    finally { setSaving(false); }
  };

  const toggle = async (c: DiscountCode) => {
    // optimistic
    setCodes((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)));
    const res = await fetch(`/api/admin/discounts/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    if (!res.ok) setCodes((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: c.active } : x))); // revert
  };

  const activeCount = useMemo(() => codes.filter((c) => c.active).length, [codes]);

  const input: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--page-bg)", color: "var(--text)", font: `500 13px ${F_SANS}` };
  const label: React.CSSProperties = { display: "block", font: `600 11px ${F_SANS}`, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--muted)", marginBottom: 6 };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 6, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ font: `700 26px ${F_GRO}`, color: "var(--text)", margin: 0 }}>Discount codes</h1>
          <p style={{ font: `400 13.5px ${F_SANS}`, color: "var(--muted)", margin: "6px 0 0" }}>
            Codes renters enter on the card payment page. {activeCount} active.
          </p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError(""); }}
          style={{ font: `600 13px ${F_SANS}`, padding: "10px 16px", borderRadius: 9, border: "none", cursor: "pointer", background: "var(--nav-active-bg)", color: "var(--nav-active-text)" }}
        >
          {showForm ? "Close" : "+ New code"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 20, margin: "16px 0 8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
            <div>
              <span style={label}>Code</span>
              <input style={input} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SUMMER20" />
            </div>
            <div>
              <span style={label}>Type</span>
              <select style={input} value={form.discountType} onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as "percent" | "fixed" }))}>
                <option value="percent">Percentage off</option>
                <option value="fixed">Fixed $ off</option>
              </select>
            </div>
            <div>
              <span style={label}>{form.discountType === "percent" ? "Percent (%)" : "Amount ($)"}</span>
              <input style={input} type="number" min="0" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder={form.discountType === "percent" ? "20" : "25"} />
            </div>
            <div>
              <span style={label}>Applies to</span>
              <select style={input} value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value as "once" | "forever" | "repeating" }))}>
                <option value="once">First month only</option>
                <option value="forever">Every month</option>
                <option value="repeating">First N months</option>
              </select>
            </div>
            {form.duration === "repeating" && (
              <div>
                <span style={label}>Number of months</span>
                <input style={input} type="number" min="1" value={form.durationInMonths} onChange={(e) => setForm((f) => ({ ...f, durationInMonths: e.target.value }))} />
              </div>
            )}
            <div>
              <span style={label}>Expires (optional)</span>
              <input style={input} type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
            </div>
            <div>
              <span style={label}>Max redemptions (optional)</span>
              <input style={input} type="number" min="1" value={form.maxRedemptions} onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))} placeholder="Unlimited" />
            </div>
          </div>
          {error && <div style={{ marginTop: 14, font: `500 12.5px ${F_SANS}`, color: "var(--danger)" }}>{error}</div>}
          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button onClick={create} disabled={saving} style={{ font: `600 13px ${F_SANS}`, padding: "10px 18px", borderRadius: 9, border: "none", cursor: "pointer", background: "var(--nav-active-bg)", color: "var(--nav-active-text)", opacity: saving ? 0.6 : 1 }}>{saving ? "Creating…" : "Create code"}</button>
            <button onClick={() => setShowForm(false)} style={{ font: `600 13px ${F_SANS}`, padding: "10px 18px", borderRadius: 9, border: "1px solid var(--card-border)", cursor: "pointer", background: "transparent", color: "var(--muted)" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 14, overflow: "hidden", marginTop: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) 1fr 1fr 1fr 120px", gap: 12, padding: "12px 18px", borderBottom: "1px solid var(--divider)", font: `600 10.5px ${F_SANS}`, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)" }}>
          <span>Code</span><span>Discount</span><span>Redemptions</span><span>Expires</span><span style={{ textAlign: "right" }}>Status</span>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", font: `500 13px ${F_SANS}` }}>Loading…</div>
        ) : codes.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", font: `500 13px ${F_SANS}` }}>No discount codes yet. Create one to get started.</div>
        ) : (
          codes.map((c) => (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) 1fr 1fr 1fr 120px", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--divider)", alignItems: "center" }}>
              <div style={{ font: `700 14px ${F_GRO}`, color: "var(--text)", letterSpacing: ".02em" }}>{c.code}</div>
              <div style={{ font: `500 13px ${F_SANS}`, color: "var(--text)" }}>
                {discountLabel(c)}
                <span style={{ color: "var(--muted)", fontSize: 11.5 }}> · {durationLabel(c)}</span>
              </div>
              <div style={{ font: `500 13px ${F_SANS}`, color: "var(--muted)" }}>
                {c.timesRedeemed}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}
              </div>
              <div style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted)" }}>{c.expiresAt ? fmtDate(c.expiresAt) : "—"}</div>
              <div style={{ textAlign: "right" }}>
                <button
                  onClick={() => toggle(c)}
                  style={{ font: `600 11px ${F_SANS}`, padding: "5px 12px", borderRadius: 999, cursor: "pointer", border: "1px solid var(--card-border)", background: c.active ? "var(--st-active-bg)" : "transparent", color: c.active ? "var(--st-active-fg)" : "var(--muted)" }}
                >
                  {c.active ? "Active" : "Disabled"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
