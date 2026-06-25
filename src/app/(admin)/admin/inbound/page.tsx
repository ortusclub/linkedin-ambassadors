"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface Lead {
  id: string;
  channel: string;
  name: string;
  handle: string | null;
  contact: string | null;
  companyEmail: string | null;
  type: string | null;
  message: string | null;
  status: string;
  replied: boolean;
  followUpDate: string | null;
  outcome: string | null;
  notes: string | null;
  firstContactAt: string;
}

const PLATFORMS = ["Telegram", "Website", "Call booking", "WhatsApp", "Email", "Other"];
const TYPES = ["Potential Renter", "Potential Ambassador", "Both", "Other"];
const STATUSES = ["New", "Replied", "In Conversation", "No Response", "Booked Call", "Converted", "Cancelled", "Not Interested"];
const STATUS_BADGE: Record<string, string> = {
  New: "bg-blue-100 text-blue-700",
  Replied: "bg-indigo-100 text-indigo-700",
  "In Conversation": "bg-amber-100 text-amber-700",
  "No Response": "bg-gray-100 text-gray-500",
  "Booked Call": "bg-purple-100 text-purple-700",
  Converted: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  "Not Interested": "bg-gray-100 text-gray-500",
};

const platformLabel = (c: string) =>
  c === "telegram" ? "Telegram" : c === "website" ? "Website" : c === "call" ? "Call booking" : c === "whatsapp" ? "WhatsApp" : c === "email" ? "Email" : c;
const dInput = (s: string | null) => (s ? new Date(s).toISOString().slice(0, 10) : "");
const dShow = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—");

const blankForm = { name: "", channel: "Website", companyEmail: "", type: "", message: "", status: "New", replied: false, followUpDate: "", outcome: "", notes: "", firstContactAt: new Date().toISOString().slice(0, 10) };

export default function AdminInboundPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [sheetConfigured, setSheetConfigured] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...blankForm });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/admin/inbound").then((r) => r.json()).then((d) => setLeads(d.leads || [])).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    fetch("/api/admin/inbound/export-url").then((r) => r.json())
      .then((d) => { setSheetConfigured(!!d.configured); setSheetUrl(d.url || null); })
      .catch(() => setSheetConfigured(false));
  }, []);

  const save = async (id: string, patch: Record<string, unknown>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    await fetch("/api/admin/inbound", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
  };
  const addLead = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/inbound", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) { setAdding(false); setForm({ ...blankForm }); load(); }
  };
  const del = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    await fetch(`/api/admin/inbound?id=${id}`, { method: "DELETE" });
  };

  const inputCls = "w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inbound Leads</h2>
          <p className="mt-1 mb-4 max-w-2xl text-sm text-gray-500">
            Everyone who reached out — Telegram messages log automatically; add the rest (website, call bookings, referrals) manually. One source of truth → pull into your sheet with the export.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setAdding((v) => !v)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">+ Add Lead</button>
          {sheetUrl && (
            <>
              <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Download CSV</a>
              <button onClick={() => { navigator.clipboard.writeText(`=IMPORTDATA("${sheetUrl}")`); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">{copied ? "Copied!" : "Copy Sheets formula"}</button>
            </>
          )}
        </div>
      </div>

      {sheetConfigured === false && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">Live Google Sheet export needs <code>RENTALS_EXPORT_KEY</code> set in the environment. (The list below still works.)</div>
      )}

      {adding && (
        <Card className="mb-5">
          <CardContent className="py-4">
            <p className="mb-3 text-sm font-semibold text-gray-900">Add a lead</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-medium text-gray-600">Name / Username *<input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="@username or name" /></label>
              <label className="text-xs font-medium text-gray-600">Platform<select className={inputCls} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></label>
              <label className="text-xs font-medium text-gray-600">Date<input type="date" className={inputCls} value={form.firstContactAt} onChange={(e) => setForm({ ...form, firstContactAt: e.target.value })} /></label>
              <label className="text-xs font-medium text-gray-600">Company / Email<input className={inputCls} value={form.companyEmail} onChange={(e) => setForm({ ...form, companyEmail: e.target.value })} /></label>
              <label className="text-xs font-medium text-gray-600">Type<select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="">—</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
              <label className="text-xs font-medium text-gray-600">Status<select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label className="text-xs font-medium text-gray-600 sm:col-span-2 lg:col-span-3">Use Case / Message<textarea className={inputCls} rows={2} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>
              <label className="text-xs font-medium text-gray-600">Follow-up date<input type="date" className={inputCls} value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} /></label>
              <label className="text-xs font-medium text-gray-600">Outcome<input className={inputCls} value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} /></label>
              <label className="text-xs font-medium text-gray-600 sm:col-span-2 lg:col-span-3">Notes<input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
            </div>
            <div className="mt-4 flex gap-2">
              <button disabled={saving || !form.name.trim()} onClick={addLead} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving…" : "Save lead"}</button>
              <button onClick={() => { setAdding(false); setForm({ ...blankForm }); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-200" />)}</div>
      ) : leads.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-gray-500">No inbound leads yet. Telegram messagers appear automatically — add website/call leads with “+ Add Lead”.</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2 whitespace-nowrap">Date</th>
                <th className="px-3 py-2">Name / Username</th>
                <th className="px-3 py-2">Platform</th>
                <th className="px-3 py-2 min-w-[150px]">Company / Email</th>
                <th className="px-3 py-2 min-w-[150px]">Type</th>
                <th className="px-3 py-2 min-w-[220px]">Use Case / Message</th>
                <th className="px-3 py-2 min-w-[140px]">Status</th>
                <th className="px-3 py-2 whitespace-nowrap">Follow-up</th>
                <th className="px-3 py-2 min-w-[140px]">Outcome</th>
                <th className="px-3 py-2 min-w-[160px]">Notes</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 align-top">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{dShow(l.firstContactAt)}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-900 whitespace-nowrap">{l.handle || l.name}</p>
                    {l.handle && l.name && l.handle !== l.name && <p className="text-xs text-gray-500">{l.name}</p>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{platformLabel(l.channel)}</td>
                  <td className="px-3 py-2"><input defaultValue={l.companyEmail || ""} placeholder="—" onBlur={(e) => save(l.id, { companyEmail: e.target.value.trim() })} className="w-36 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-gray-200 focus:border-blue-400 focus:bg-white focus:outline-none" /></td>
                  <td className="px-3 py-2">
                    <select value={l.type || ""} onChange={(e) => save(l.id, { type: e.target.value })} className="rounded border-none bg-transparent text-sm text-gray-700 cursor-pointer focus:outline-none"><option value="">—</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
                  </td>
                  <td className="px-3 py-2 text-gray-700"><p className="line-clamp-3 max-w-md">{l.message || "—"}</p></td>
                  <td className="px-3 py-2">
                    <select value={STATUSES.includes(l.status) ? l.status : "New"} onChange={(e) => save(l.id, { status: e.target.value })} className={`rounded-full px-2 py-1 text-[11px] font-semibold border-none cursor-pointer ${STATUS_BADGE[l.status] || "bg-gray-100 text-gray-600"}`}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                  </td>
                  <td className="px-3 py-2"><input type="date" defaultValue={dInput(l.followUpDate)} onBlur={(e) => save(l.id, { followUpDate: e.target.value || null })} className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-gray-600 hover:border-gray-200 focus:border-blue-400 focus:bg-white focus:outline-none" /></td>
                  <td className="px-3 py-2"><input defaultValue={l.outcome || ""} placeholder="—" onBlur={(e) => save(l.id, { outcome: e.target.value.trim() })} className="w-32 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-gray-200 focus:border-blue-400 focus:bg-white focus:outline-none" /></td>
                  <td className="px-3 py-2"><input defaultValue={l.notes || ""} placeholder="—" onBlur={(e) => save(l.id, { notes: e.target.value.trim() })} className="w-40 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-gray-200 focus:border-blue-400 focus:bg-white focus:outline-none" /></td>
                  <td className="px-3 py-2"><button onClick={() => del(l.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
