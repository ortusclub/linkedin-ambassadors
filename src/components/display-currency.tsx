"use client";
import { useEffect, useState } from "react";
import type { Currency } from "@/lib/referral-currency";

export function useDisplayCurrency(key: string, serverPreference?: string, portalToken?: string) {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`lv-currency:${key}`);
      const selected = serverPreference || stored;
      setCurrency(selected === "PHP" ? "PHP" : "USD");
    } catch { setCurrency(serverPreference === "PHP" ? "PHP" : "USD"); }
  }, [key, serverPreference]);
  async function change(value: Currency) {
    setSaving(true); setError("");
    try {
      if (portalToken) {
        const res = await fetch(`/api/m/${encodeURIComponent(portalToken)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "displayCurrency", currency: value }) });
        if (!res.ok) throw new Error("Could not save currency. Please try again.");
      }
      setCurrency(value);
      try { localStorage.setItem(`lv-currency:${key}`, value); } catch { /* server preference or current session still works */ }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save currency."); }
    finally { setSaving(false); }
  }
  return { currency, change, saving, error };
}
export function CurrencySelector({ preference }: { preference: ReturnType<typeof useDisplayCurrency> }) {
  return <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12, padding: "10px 18px", background: "#edf5f0", color: "#235b3e" }}>
    <label>Show prices in <select aria-label="Display currency" value={preference.currency} disabled={preference.saving} onChange={e => void preference.change(e.target.value as Currency)} style={{ padding: "6px 9px", border: "1px solid #b2cdbb", borderRadius: 8, background: "white", color: "#173c29", marginLeft: 6 }}><option value="USD">USD ($) first</option><option value="PHP">PHP (₱) first</option></select></label>
    <span>{preference.saving ? "Saving…" : "Preference remembered"}</span>
    {preference.error && <span role="alert" style={{ color: "#a32929" }}>{preference.error}</span>}
  </div>;
}
