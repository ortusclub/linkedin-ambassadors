"use client";

import { useState } from "react";

const PRESETS = [25, 50, 100, 250];
const MIN_TOPUP = 10;

export function CardTopUp() {
  const [selected, setSelected] = useState<number | "custom">(50);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount =
    selected === "custom" ? parseFloat(customAmount) || 0 : selected;
  const valid = amount >= MIN_TOPUP && amount <= 10000;

  const handleCheckout = async () => {
    setError(null);
    if (!valid) {
      setError(`Minimum top-up is $${MIN_TOPUP}.`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/card-topup-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Could not start checkout. Try again.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not start checkout. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <p className="text-xs font-semibold text-gray-700 mb-2">
        Pay with Card{" "}
        <span className="font-normal text-gray-400">— via Stripe</span>
      </p>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setSelected(p)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
              selected === p
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
            }`}
          >
            ${p}
          </button>
        ))}
        <button
          onClick={() => setSelected("custom")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
            selected === "custom"
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
          }`}
        >
          Custom
        </button>
      </div>

      {selected === "custom" && (
        <div className="mb-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              $
            </span>
            <input
              type="number"
              min={MIN_TOPUP}
              step="1"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder={`${MIN_TOPUP} or more`}
              className="w-full rounded-lg border border-gray-200 pl-6 pr-3 py-1.5 text-xs"
            />
          </div>
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading || !valid}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#635BFF] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4F47D9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? "Loading..."
          : `Pay $${amount > 0 ? amount.toFixed(2) : "0.00"} with Card`}
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </button>

      {error && (
        <p className="text-xs text-red-600 mt-1.5">{error}</p>
      )}
      <p className="text-xs text-gray-400 mt-1.5">
        Minimum ${MIN_TOPUP}. No markup — pay exactly what you top up. Standard
        card fees apply.
      </p>
    </div>
  );
}
