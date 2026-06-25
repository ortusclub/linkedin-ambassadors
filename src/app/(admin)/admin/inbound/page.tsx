"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface Lead {
  id: string;
  channel: string;
  name: string;
  handle: string | null;
  contact: string | null;
  message: string | null;
  status: string;
  notes: string | null;
  messageCount: number;
  firstContactAt: string;
  lastContactAt: string;
}

const STATUSES = ["new", "contacted", "converted", "ignored"];
const STATUS_BADGE: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  converted: "bg-green-100 text-green-700",
  ignored: "bg-gray-100 text-gray-500",
};

const fmt = (s: string) =>
  new Date(s).toLocaleString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function AdminInboundPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [sheetConfigured, setSheetConfigured] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/inbound")
      .then((r) => r.json())
      .then((d) => setLeads(d.leads || []))
      .finally(() => setLoading(false));
    fetch("/api/admin/inbound/export-url")
      .then((r) => r.json())
      .then((d) => { setSheetConfigured(!!d.configured); setSheetUrl(d.url || null); })
      .catch(() => setSheetConfigured(false));
  }, []);

  const save = async (id: string, patch: { status?: string; notes?: string }) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    await fetch("/api/admin/inbound", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inbound Leads</h2>
          <p className="mt-1 mb-4 max-w-2xl text-sm text-gray-500">
            People who reached out to us — Telegram messages and call bookings. Signups/customers live under Renters (not inbound).
          </p>
        </div>
        {sheetUrl && (
          <div className="flex gap-2">
            <a href={sheetUrl} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100" target="_blank" rel="noopener noreferrer">Download CSV</a>
            <button
              onClick={() => { navigator.clipboard.writeText(`=IMPORTDATA("${sheetUrl}")`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              {copied ? "Copied!" : "Copy Google Sheets formula"}
            </button>
          </div>
        )}
      </div>

      {sheetConfigured === false && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Live Google Sheet export needs <code>RENTALS_EXPORT_KEY</code> set in the environment.
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-200" />)}</div>
      ) : leads.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-gray-500">No inbound leads yet. Telegram messagers will appear here automatically.</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Who</th>
                <th className="px-3 py-2 min-w-[240px]">Latest message</th>
                <th className="px-3 py-2 text-center">Msgs</th>
                <th className="px-3 py-2">First</th>
                <th className="px-3 py-2">Last</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 min-w-[160px]">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 align-top">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-gray-700">
                      {l.channel === "telegram" ? "💬 Telegram" : l.channel === "call" ? "📅 Call" : l.channel}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-900 whitespace-nowrap">{l.name}</p>
                    {l.handle && <p className="text-xs text-gray-500">{l.handle}</p>}
                    {l.contact && <p className="font-mono text-[10px] text-gray-400">{l.contact}</p>}
                  </td>
                  <td className="px-3 py-2 text-gray-700"><p className="line-clamp-3 max-w-md">{l.message || "—"}</p></td>
                  <td className="px-3 py-2 text-center font-semibold text-gray-700">{l.messageCount}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{fmt(l.firstContactAt)}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{fmt(l.lastContactAt)}</td>
                  <td className="px-3 py-2">
                    <select
                      value={l.status}
                      onChange={(e) => save(l.id, { status: e.target.value })}
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold border-none cursor-pointer ${STATUS_BADGE[l.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      defaultValue={l.notes || ""}
                      placeholder="—"
                      onBlur={(e) => save(l.id, { notes: e.target.value.trim() })}
                      className="w-40 rounded border border-transparent bg-transparent px-1.5 py-1 text-sm hover:border-gray-200 focus:border-blue-400 focus:bg-white focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
