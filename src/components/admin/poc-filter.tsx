"use client";

import { assignedCrmOwnerOptions, ownerKey, type CrmOwner } from "@/lib/crm-owners";

export function PocFilter({ owners, leads, value, onChange }: { owners: CrmOwner[]; leads: { ownerEmail: string | null }[]; value: string; onChange: (value: string) => void }) {
  const people = assignedCrmOwnerOptions(owners, leads).map(o => ({ ...o, label: o.value === "ardi@linkedvelocity.com" ? "Ardi" : o.label.split(" (")[0], count: leads.filter(l => ownerKey(l.ownerEmail) === o.value).length }));
  const options = [{ value: "all", label: "All", count: leads.length }, ...people, { value: "unassigned", label: "Unassigned", count: leads.filter(l => !ownerKey(l.ownerEmail)).length }];
  return <div aria-label="Filter by LV PoC" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", color: "var(--muted)", marginRight: 20 }}>POC</span>
    {options.map(option => {
      const active = value === option.value;
      return <button key={option.value} aria-pressed={active} onClick={() => onChange(option.value)} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "8px 14px", border: `1px solid ${active ? "transparent" : "var(--card-border)"}`, background: active ? "var(--chip-active-bg, #e5edff)" : "transparent", color: active ? "var(--accent, #2458eb)" : "var(--muted)", font: "600 14px var(--font-sans), system-ui, sans-serif", cursor: "pointer" }}>
        {option.value !== "all" && <span style={{ width: 7, height: 7, borderRadius: "50%", background: option.value === "unassigned" ? "#a8b1c1" : "#b85b09" }} />}
        {option.label}<span style={{ background: "var(--card)", borderRadius: 7, padding: "2px 6px", color: "var(--muted)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{option.count}</span>
      </button>;
    })}
  </div>;
}
