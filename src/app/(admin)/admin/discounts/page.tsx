"use client";

import { useEffect, useMemo, useState } from "react";

const F_SANS = "var(--font-sans),system-ui,sans-serif";
const F_GRO = "var(--font-grotesk),system-ui,sans-serif";

type DType = "percent" | "fixed" | "flat" | "tiered";
interface TierRule { verified: boolean; minConnections: number; price: number }
interface DiscountCode {
  id: string;
  code: string;
  type: DType;
  value: number;
  tiers: TierRule[] | null;
  active: boolean;
  maxRedemptions: number | null;
  timesRedeemed: number;
  expiresAt: string | null;
  note: string | null;
  createdAt: string;
}

// ProfilePartner's 4-tier price book — the default when you pick "Partner tiered pricing".
const PP_TIERS: TierRule[] = [
  { verified: false, minConnections: 0, price: 30 },
  { verified: false, minConnections: 200, price: 35 },
  { verified: true, minConnections: 0, price: 40 },
  { verified: true, minConnections: 200, price: 50 },
];

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (iso: string) => { const d = new Date(iso); return `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
const valueLabel = (c: DiscountCode) =>
  c.type === "percent" ? `${c.value}% off`
  : c.type === "fixed" ? `$${c.value.toFixed(2)} off`
  : c.type === "tiered" ? `Partner pricing · ${(c.tiers?.length ?? 0)} tiers`
  : `$${c.value.toFixed(2)}/mo flat`;

export default function AdminDiscountsPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    code: "",
    type: "percent" as DType,
    value: "",
    tiers: [] as TierRule[],
    expiresAt: "",
    maxRedemptions: "",
    note: "",
  });

  // Switching type: seed the PP tier table when choosing tiered, so the admin can tweak it.
  const setType = (type: DType) =>
    setForm((f) => ({ ...f, type, tiers: type === "tiered" && f.tiers.length === 0 ? PP_TIERS.map((t) => ({ ...t })) : f.tiers }));
  const setTier = (i: number, patch: Partial<TierRule>) =>
    setForm((f) => ({ ...f, tiers: f.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) }));
  const addTier = () => setForm((f) => ({ ...f, tiers: [...f.tiers, { verified: false, minConnections: 0, price: 0 }] }));
  const removeTier = (i: number) => setForm((f) => ({ ...f, tiers: f.tiers.filter((_, idx) => idx !== i) }));

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
          type: form.type,
          value: Number(form.value),
          tiers: form.type === "tiered" ? form.tiers : undefined,
          expiresAt: form.expiresAt || undefined,
          maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
          note: form.note || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not create code"); return; }
      setShowForm(false);
      setForm({ code: "", type: "percent", value: "", tiers: [], expiresAt: "", maxRedemptions: "", note: "" });
      load();
    } catch { setError("Something went wrong. Please try again."); }
    finally { setSaving(false); }
  };

  const toggle = async (c: DiscountCode) => {
    setCodes((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)));
    const res = await fetch(`/api/admin/discounts/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    if (!res.ok) setCodes((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: c.active } : x)));
  };

  const remove = async (c: DiscountCode) => {
    if (!confirm(`Delete code ${c.code}? This can't be undone.`)) return;
    const res = await fetch(`/api/admin/discounts/${c.id}`, { method: "DELETE" });
    if (res.ok) setCodes((prev) => prev.filter((x) => x.id !== c.id));
  };

  const activeCount = useMemo(() => codes.filter((c) => c.active).length, [codes]);

  const input: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--page-bg)", color: "var(--text)", font: `500 13px ${F_SANS}` };
  const label: React.CSSProperties = { display: "block", font: `600 11px ${F_SANS}`, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--muted)", marginBottom: 6 };
  const valueHint = form.type === "percent" ? "e.g. 20 (= 20% off)" : form.type === "fixed" ? "e.g. 15 (= $15 off)" : "e.g. 45 (= $45/mo flat)";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 6, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ font: `700 26px ${F_GRO}`, color: "var(--text)", margin: 0 }}>Discount codes</h1>
          <p style={{ font: `400 13.5px ${F_SANS}`, color: "var(--muted)", margin: "6px 0 0" }}>
            Vouchers renters enter at checkout. {activeCount} active.
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
              <select style={input} value={form.type} onChange={(e) => setType(e.target.value as DType)}>
                <option value="percent">Percentage off</option>
                <option value="fixed">Fixed $ off</option>
                <option value="flat">Flat price ($/mo)</option>
                <option value="tiered">Partner tiered pricing</option>
              </select>
            </div>
            {form.type !== "tiered" && (
              <div>
                <span style={label}>{form.type === "percent" ? "Percent (%)" : form.type === "fixed" ? "Amount off ($)" : "Monthly price ($)"}</span>
                <input style={input} type="number" min="0" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder={valueHint} />
              </div>
            )}
            <div>
              <span style={label}>Expires (optional)</span>
              <input style={input} type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
            </div>
            <div>
              <span style={label}>Max uses (optional)</span>
              <input style={input} type="number" min="1" value={form.maxRedemptions} onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))} placeholder="Unlimited" />
            </div>
            <div>
              <span style={label}>Note (optional)</span>
              <input style={input} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. Partner deal — Acme" />
            </div>
          </div>

          {form.type === "tiered" && (
            <div style={{ marginTop: 16 }}>
              <span style={label}>Pricing tiers — each account is charged the matching tier (its verified status + connections)</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {form.tiers.map((t, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 36px", gap: 8, alignItems: "center" }}>
                    <select style={input} value={t.verified ? "v" : "u"} onChange={(e) => setTier(i, { verified: e.target.value === "v" })}>
                      <option value="u">Unverified</option>
                      <option value="v">Verified</option>
                    </select>
                    <div style={{ position: "relative" }}>
                      <input style={input} type="number" min="0" value={t.minConnections} onChange={(e) => setTier(i, { minConnections: Number(e.target.value) })} placeholder="min connections" />
                    </div>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", font: `500 13px ${F_SANS}` }}>$</span>
                      <input style={{ ...input, paddingLeft: 20 }} type="number" min="0" value={t.price} onChange={(e) => setTier(i, { price: Number(e.target.value) })} placeholder="price/mo" />
                    </div>
                    <button onClick={() => removeTier(i)} title="Remove tier" style={{ font: `600 14px ${F_SANS}`, height: 36, borderRadius: 8, cursor: "pointer", border: "1px solid var(--card-border)", background: "transparent", color: "var(--muted)" }}>×</button>
                  </div>
                ))}
              </div>
              <button onClick={addTier} style={{ marginTop: 8, font: `600 12px ${F_SANS}`, padding: "7px 12px", borderRadius: 8, cursor: "pointer", border: "1px dashed var(--card-border)", background: "transparent", color: "var(--muted)" }}>+ Add tier</button>
              <p style={{ font: `400 11.5px ${F_SANS}`, color: "var(--muted)", marginTop: 8 }}>Rows are read most-specific-first: an account uses the highest connection threshold it meets for its verified status. Keep a 0-connection row for each status so nothing is left unpriced.</p>
            </div>
          )}

          {error && <div style={{ marginTop: 14, font: `500 12.5px ${F_SANS}`, color: "var(--danger)" }}>{error}</div>}
          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button onClick={create} disabled={saving} style={{ font: `600 13px ${F_SANS}`, padding: "10px 18px", borderRadius: 9, border: "none", cursor: "pointer", background: "var(--nav-active-bg)", color: "var(--nav-active-text)", opacity: saving ? 0.6 : 1 }}>{saving ? "Creating…" : "Create code"}</button>
            <button onClick={() => setShowForm(false)} style={{ font: `600 13px ${F_SANS}`, padding: "10px 18px", borderRadius: 9, border: "1px solid var(--card-border)", cursor: "pointer", background: "transparent", color: "var(--muted)" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 14, overflow: "hidden", marginTop: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) 1fr 1fr 1fr 150px", gap: 12, padding: "12px 18px", borderBottom: "1px solid var(--divider)", font: `600 10.5px ${F_SANS}`, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)" }}>
          <span>Code</span><span>Discount</span><span>Uses</span><span>Expires</span><span style={{ textAlign: "right" }}>Status</span>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", font: `500 13px ${F_SANS}` }}>Loading…</div>
        ) : codes.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", font: `500 13px ${F_SANS}` }}>No discount codes yet. Create one to get started.</div>
        ) : (
          codes.map((c) => (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) 1fr 1fr 1fr 150px", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--divider)", alignItems: "center" }}>
              <div>
                <div style={{ font: `700 14px ${F_GRO}`, color: "var(--text)", letterSpacing: ".02em" }}>{c.code}</div>
                {c.note && <div style={{ font: `400 11.5px ${F_SANS}`, color: "var(--muted)", marginTop: 2 }}>{c.note}</div>}
              </div>
              <div style={{ font: `500 13px ${F_SANS}`, color: "var(--text)" }}>{valueLabel(c)}</div>
              <div style={{ font: `500 13px ${F_SANS}`, color: "var(--muted)" }}>{c.timesRedeemed}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}</div>
              <div style={{ font: `500 12.5px ${F_SANS}`, color: "var(--muted)" }}>{c.expiresAt ? fmtDate(c.expiresAt) : "—"}</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                <button
                  onClick={() => toggle(c)}
                  style={{ font: `600 11px ${F_SANS}`, padding: "5px 12px", borderRadius: 999, cursor: "pointer", border: "1px solid var(--card-border)", background: c.active ? "var(--st-active-bg)" : "transparent", color: c.active ? "var(--st-active-fg)" : "var(--muted)" }}
                >
                  {c.active ? "Active" : "Disabled"}
                </button>
                <button onClick={() => remove(c)} title="Delete" style={{ font: `600 13px ${F_SANS}`, width: 28, height: 28, borderRadius: 7, cursor: "pointer", border: "1px solid var(--card-border)", background: "transparent", color: "var(--muted)" }}>×</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
