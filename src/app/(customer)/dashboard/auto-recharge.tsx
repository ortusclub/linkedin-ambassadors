"use client";

import { useEffect, useState } from "react";

interface Settings {
  enabled: boolean;
  threshold: number | null;
  amount: number | null;
  balance: number;
  card: { brand: string | null; last4: string | null } | null;
}

// Twilio-style auto-recharge control: keep the wallet topped up by charging the saved card
// when the balance drops below a threshold. Opt-in — turning it on is the renter's consent.
export function AutoRecharge() {
  const [s, setS] = useState<Settings | null>(null);
  const [threshold, setThreshold] = useState("50");
  const [amount, setAmount] = useState("100");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/wallet/auto-recharge")
      .then((r) => r.json())
      .then((d: Settings) => {
        setS(d);
        if (d.threshold != null) setThreshold(String(d.threshold));
        if (d.amount != null) setAmount(String(d.amount));
      })
      .catch(() => {});
  }, []);

  // No card on file → send them through Stripe to add one (no charge), enabling auto-recharge
  // with the chosen settings on return.
  const addCardAndEnable = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/wallet/card-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enable: true, threshold: Number(threshold), amount: Number(amount) }),
      });
      const d = await res.json();
      if (!res.ok || !d.url) { setError(d.error || "Could not start card setup."); setSaving(false); return; }
      window.location.href = d.url;
    } catch { setError("Something went wrong. Try again."); setSaving(false); }
  };

  const save = async (enabled: boolean) => {
    setError(null);
    setSaved(false);
    if (enabled && !s?.card) return addCardAndEnable();
    setSaving(true);
    try {
      const res = await fetch("/api/wallet/auto-recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, threshold: Number(threshold), amount: Number(amount) }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (d.needsCard) return addCardAndEnable();
        setError(d.error || "Could not save."); setSaving(false); return;
      }
      setS((prev) => prev ? { ...prev, enabled, threshold: Number(threshold), amount: Number(amount) } : prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { setError("Something went wrong. Try again."); }
    finally { setSaving(false); }
  };

  if (!s) return null;

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-700">
          Auto-recharge{" "}
          <span className="font-normal text-gray-400">— keep your balance topped up</span>
        </p>
        <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${s.enabled ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {s.enabled ? "On" : "Off"}
        </span>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">When balance below</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">$</span>
            <input type="number" min="5" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="w-full rounded-lg border border-gray-200 pl-5 pr-2 py-1.5 text-xs" />
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Recharge by</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">$</span>
            <input type="number" min="10" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-gray-200 pl-5 pr-2 py-1.5 text-xs" />
          </div>
        </div>
      </div>

      {s.card && (
        <p className="text-[11px] text-gray-400 mt-2">
          Charges {s.card.brand ? `${s.card.brand} ` : ""}•••• {s.card.last4} automatically. We email a receipt each time.
        </p>
      )}

      <div className="mt-2.5 flex items-center gap-2">
        {s.enabled ? (
          <>
            <button onClick={() => save(true)} disabled={saving} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
              {saving ? "Saving…" : "Update"}
            </button>
            <button onClick={() => save(false)} disabled={saving} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              Turn off
            </button>
          </>
        ) : (
          <button onClick={() => save(true)} disabled={saving} className="rounded-lg bg-[#0A66C2] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#004182] disabled:opacity-50">
            {saving ? "…" : s.card ? "Turn on auto-recharge" : "Add card & turn on"}
          </button>
        )}
        {saved && <span className="text-[11px] font-semibold text-green-600">Saved</span>}
      </div>

      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}
