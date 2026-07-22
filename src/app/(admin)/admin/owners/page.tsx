"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Ambassador payouts are in PHP. Setup fee is a one-time ₱1,000; recurring is ₱500/mo.
const peso = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);
const SETUP_FEE = 1000;
const fmtDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

// Setup fee is due N days after onboarding: 3 for an established account, 1 week for a fresh one.
const setupDueDate = (onboardedAt: string | null, freshness: string | null): Date | null => {
  if (!onboardedAt) return null;
  const d = new Date(onboardedAt);
  d.setDate(d.getDate() + (freshness === "fresh" ? 7 : 3));
  return d;
};

// Monthly ₱500 lands on the 1st business day of each month, starting the first
// full month after onboarding. The Nth payment (idx, 0-based) advances by a month.
const monthlyDueDate = (onboardedAt: string | null, idx: number): Date | null => {
  if (!onboardedAt) return null;
  const o = new Date(onboardedAt);
  const d = new Date(o.getFullYear(), o.getMonth() + 1 + idx, 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
};

const isOverdue = (d: Date | null) => !!d && d.getTime() < Date.now();

interface OwnerAccount {
  id: string;
  linkedinName: string;
  status: string;
  linkedinUrl: string | null;
  monthlyPrice: string | number;
  ambassadorPayment: string | number;
  loginEmail: string | null;
  accountPassword: string | null;
  twoFactor: string | null;
  workEmail: string | null;
}

interface MonthlyPayout {
  paidAt: string;
  amount: number;
  note?: string | null;
  by?: string | null;
}

interface Owner {
  email: string;
  fullName: string;
  joinedAt: string | null;
  accountCount: number;
  monthlyPayout: number;
  applicationId: string | null;
  paymentMethod: string | null;
  paymentDetails: string | null;
  setupFeePaidAt: string | null;
  monthlyPayouts: MonthlyPayout[];
  onboardedAt: string | null;
  verifiedAt: string | null;
  accountFreshness: string | null;
  accounts: OwnerAccount[];
}

// Uncontrolled save-on-blur field. Defined at module scope so it never remounts mid-edit.
function Editable({
  initial, onSave, placeholder, type = "text", mono = false,
}: {
  initial: string | null;
  onSave: (v: string | null) => void;
  placeholder?: string;
  type?: "text" | "password";
  mono?: boolean;
}) {
  return (
    <input
      type={type}
      defaultValue={initial ?? ""}
      placeholder={placeholder}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (v !== (initial ?? "")) onSave(v || null);
      }}
      className={`w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 ${mono ? "font-mono" : ""}`}
    />
  );
}

function CopyBtn({ value }: { value: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
      className="shrink-0 rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      title="Copy"
    >
      {copied ? "✓" : "Copy"}
    </button>
  );
}

export default function AdminOwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    return fetch("/api/admin/owners")
      .then((r) => r.json())
      .then((data) => setOwners(data.owners || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (email: string) =>
    setExpanded((prev) => { const n = new Set(prev); if (n.has(email)) n.delete(email); else n.add(email); return n; });
  const toggleReveal = (key: string) =>
    setRevealed((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const patchAccount = async (accountId: string, data: Record<string, unknown>) => {
    await fetch(`/api/admin/accounts/${accountId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    load();
  };
  const patchOwner = async (applicationId: string | null, data: Record<string, unknown>) => {
    if (!applicationId) { alert("No application record linked to this owner — can't save payout details."); return; }
    await fetch(`/api/admin/ambassadors/${applicationId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    load();
  };

  const statusVariant = (s: string) => {
    const map: Record<string, "success" | "info" | "warning" | "danger" | "default"> = {
      available: "success", rented: "info", unavailable: "danger", maintenance: "warning", retired: "default",
    };
    return map[s] || "default";
  };

  const withAccounts = owners.length;
  const totalMonthly = owners.reduce((s, o) => s + o.monthlyPayout, 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Account Owners</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Onboarded ambassadors who supply profiles. Expand an owner for their account credentials, payout method, and the setup-fee &amp; monthly payment schedule.
          </p>
        </div>
        <div className="text-right text-sm text-gray-500">
          <p>{withAccounts} owner{withAccounts !== 1 ? "s" : ""}</p>
          {totalMonthly > 0 && <p className="text-gray-400">{peso(totalMonthly)}/mo total</p>}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />)}</div>
      ) : owners.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-500">No onboarded account owners yet</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {owners.map((owner) => {
            const isOpen = expanded.has(owner.email);
            const setupPaid = fmtDate(owner.setupFeePaidAt);
            const monthlyCount = owner.monthlyPayouts.length;
            const setupDue = setupDueDate(owner.onboardedAt, owner.accountFreshness);
            const nextMonthlyDue = monthlyDueDate(owner.onboardedAt, monthlyCount);
            const monthlyAmt = owner.monthlyPayout || 500;
            return (
              <div key={owner.email} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {/* Summary row */}
                <button
                  type="button"
                  onClick={() => toggle(owner.email)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-gray-50"
                >
                  <span className={`text-gray-400 transition-transform ${isOpen ? "rotate-90" : ""}`}>▸</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{owner.fullName}</p>
                    <p className="truncate text-xs text-gray-500">{owner.email}</p>
                  </div>
                  <div className="hidden sm:block">
                    <Badge variant="success" className="text-[10px]">Has account · {owner.accountCount}</Badge>
                  </div>
                  <div className="hidden text-right md:block">
                    <p className="text-sm font-medium text-gray-900">{owner.monthlyPayout > 0 ? `${peso(owner.monthlyPayout)}/mo` : "TBC"}</p>
                    <p className="text-xs text-gray-400">
                      {setupPaid ? "Setup paid" : "Setup due"}{monthlyCount > 0 ? ` · ${monthlyCount} mo paid` : ""}
                    </p>
                  </div>
                </button>

                {isOpen && (
                  <div className="space-y-5 border-t border-gray-100 bg-gray-50/60 px-4 py-4">
                    {/* Payout */}
                    <section>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Payout</h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-xs text-gray-500">Method (GCash / bank / etc.)</span>
                          <Editable initial={owner.paymentMethod} placeholder="e.g. GCash"
                            onSave={(v) => patchOwner(owner.applicationId, { paymentMethod: v })} />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs text-gray-500">Account number / details</span>
                          <Editable initial={owner.paymentDetails} placeholder="e.g. 0917 123 4567" mono
                            onSave={(v) => patchOwner(owner.applicationId, { paymentDetails: v })} />
                        </label>
                      </div>
                    </section>

                    {/* Payment schedule */}
                    <section>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Payment schedule</h4>
                      <div className="space-y-2">
                        {/* Setup fee */}
                        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Setup fee · {peso(SETUP_FEE)}</p>
                            {setupPaid ? (
                              <p className="text-xs text-gray-500">Paid {setupPaid}</p>
                            ) : setupDue ? (
                              <p className={`text-xs ${isOverdue(setupDue) ? "font-medium text-red-600" : "text-gray-500"}`}>
                                Due {fmtDate(setupDue)}{isOverdue(setupDue) ? " · overdue" : ""}
                                <span className="text-gray-400"> · {owner.accountFreshness === "fresh" ? "fresh, +1 week" : "established, +3 days"}</span>
                              </p>
                            ) : (
                              <p className="text-xs text-gray-400">Set an onboarding date to schedule this</p>
                            )}
                            {!setupPaid && (
                              <select
                                value={owner.accountFreshness || "established"}
                                onChange={(e) => patchOwner(owner.applicationId, { accountFreshness: e.target.value })}
                                className="mt-1 rounded border border-gray-200 bg-white px-1 py-0.5 text-xs text-gray-600 focus:outline-none"
                              >
                                <option value="established">Established (setup +3 days)</option>
                                <option value="fresh">Fresh / new (setup +1 week)</option>
                              </select>
                            )}
                          </div>
                          {setupPaid ? (
                            <button type="button" onClick={() => patchOwner(owner.applicationId, { paidAt: null })}
                              className="text-xs text-gray-400 hover:text-red-600">Clear</button>
                          ) : (
                            <button type="button" onClick={() => patchOwner(owner.applicationId, { paidAt: new Date().toISOString() })}
                              className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700">Mark paid</button>
                          )}
                        </div>

                        {/* Monthly */}
                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">Monthly · {peso(monthlyAmt)}/mo</p>
                              <p className={`text-xs ${isOverdue(nextMonthlyDue) ? "font-medium text-red-600" : "text-gray-500"}`}>
                                {nextMonthlyDue
                                  ? `${monthlyCount > 0 ? `${monthlyCount} logged · next` : "First payment"} due ${fmtDate(nextMonthlyDue)}${isOverdue(nextMonthlyDue) ? " · overdue" : ""}`
                                  : "Set an onboarding date to schedule this"}
                              </p>
                              <p className="text-[11px] text-gray-400">1st business day of each month</p>
                            </div>
                            <button type="button"
                              onClick={() => patchOwner(owner.applicationId, { addMonthlyPayout: { amount: monthlyAmt } })}
                              className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700">
                              + Log {peso(monthlyAmt)}
                            </button>
                          </div>
                          {monthlyCount > 0 && (
                            <ul className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                              {owner.monthlyPayouts.map((p, i) => (
                                <li key={i} className="flex items-center justify-between text-xs text-gray-600">
                                  <span>{peso(Number(p.amount) || 0)} · {fmtDate(p.paidAt)}{p.by ? ` · ${p.by}` : ""}</span>
                                  <button type="button" onClick={() => patchOwner(owner.applicationId, { removeMonthlyPayout: i })}
                                    className="text-gray-300 hover:text-red-600">✕</button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Accounts + credentials */}
                    <section>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Profile{owner.accounts.length !== 1 ? "s" : ""} &amp; credentials
                      </h4>
                      <div className="space-y-3">
                        {owner.accounts.map((acc) => {
                          const pwKey = `${acc.id}:pw`, tfKey = `${acc.id}:tf`;
                          return (
                            <div key={acc.id} className="rounded-lg border border-gray-200 bg-white p-3">
                              <div className="mb-2 flex items-center gap-2">
                                <span className="font-medium text-gray-900">{acc.linkedinName}</span>
                                <Badge variant={statusVariant(acc.status)} className="text-[10px]">{acc.status}</Badge>
                                {Number(acc.ambassadorPayment) > 0 ? <span className="text-xs text-gray-400">{peso(Number(acc.ambassadorPayment))}/mo</span> : null}
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block sm:col-span-2">
                                  <span className="mb-1 block text-xs text-gray-500">LinkedIn URL</span>
                                  <div className="flex items-center gap-1">
                                    <Editable initial={acc.linkedinUrl} placeholder="https://linkedin.com/in/…" mono
                                      onSave={(v) => patchAccount(acc.id, { linkedinUrl: v })} />
                                    {acc.linkedinUrl && (
                                      <a href={acc.linkedinUrl} target="_blank" rel="noreferrer"
                                        className="shrink-0 rounded px-1.5 py-0.5 text-xs text-blue-600 hover:bg-blue-50">Open</a>
                                    )}
                                  </div>
                                </label>
                                <label className="block">
                                  <span className="mb-1 block text-xs text-gray-500">Monthly payout (₱)</span>
                                  <input
                                    type="number"
                                    defaultValue={Number(acc.ambassadorPayment) || ""}
                                    placeholder="500"
                                    onBlur={(e) => {
                                      const n = e.target.value === "" ? 0 : Number(e.target.value);
                                      if (!Number.isNaN(n) && n !== Number(acc.ambassadorPayment)) patchAccount(acc.id, { ambassadorPayment: n });
                                    }}
                                    className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
                                  />
                                </label>
                                <label className="block">
                                  <span className="mb-1 block text-xs text-gray-500">Account email (their login)</span>
                                  <div className="flex items-center gap-1">
                                    <Editable initial={acc.loginEmail} placeholder="account@email.com" mono
                                      onSave={(v) => patchAccount(acc.id, { loginEmail: v })} />
                                    <CopyBtn value={acc.loginEmail} />
                                  </div>
                                </label>
                                <label className="block">
                                  <span className="mb-1 block text-xs text-gray-500">Work email (klabber.co we added)</span>
                                  <div className="flex items-center gap-1">
                                    <Editable initial={acc.workEmail} placeholder="name@klabber.co" mono
                                      onSave={(v) => patchAccount(acc.id, { workEmail: v })} />
                                    <CopyBtn value={acc.workEmail} />
                                  </div>
                                </label>
                                <label className="block">
                                  <span className="mb-1 block text-xs text-gray-500">Password</span>
                                  <div className="flex items-center gap-1">
                                    <Editable initial={acc.accountPassword} placeholder="•••••••" mono
                                      type={revealed.has(pwKey) ? "text" : "password"}
                                      onSave={(v) => patchAccount(acc.id, { accountPassword: v })} />
                                    <button type="button" onClick={() => toggleReveal(pwKey)}
                                      className="shrink-0 rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                                      {revealed.has(pwKey) ? "Hide" : "Show"}
                                    </button>
                                    <CopyBtn value={acc.accountPassword} />
                                  </div>
                                </label>
                                <label className="block">
                                  <span className="mb-1 block text-xs text-gray-500">2FA (backup code / secret)</span>
                                  <div className="flex items-center gap-1">
                                    <Editable initial={acc.twoFactor} placeholder="2FA / recovery" mono
                                      type={revealed.has(tfKey) ? "text" : "password"}
                                      onSave={(v) => patchAccount(acc.id, { twoFactor: v })} />
                                    <button type="button" onClick={() => toggleReveal(tfKey)}
                                      className="shrink-0 rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                                      {revealed.has(tfKey) ? "Hide" : "Show"}
                                    </button>
                                    <CopyBtn value={acc.twoFactor} />
                                  </div>
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
