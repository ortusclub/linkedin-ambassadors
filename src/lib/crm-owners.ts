export type CrmOwner = { email: string; fullName: string | null };
export const ownerKey = (value: string | null | undefined) => (value || "").trim().toLowerCase();

export function crmOwnerOptions(team: CrmOwner[], leads: { ownerEmail: string | null }[]) {
  const options = new Map<string, { value: string; label: string }>();
  for (const member of team) {
    const value = ownerKey(member.email);
    if (value) options.set(value, { value, label: member.fullName ? `${member.fullName} (${member.email})` : member.email });
  }
  for (const lead of leads) {
    const value = ownerKey(lead.ownerEmail);
    if (value && !options.has(value)) options.set(value, { value, label: lead.ownerEmail!.trim() });
  }
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function matchesCrmOwner(value: string | null, filter: string) {
  return filter === "all" || (filter === "unassigned" ? !ownerKey(value) : ownerKey(value) === ownerKey(filter));
}

export function assignedCrmOwnerOptions(team: CrmOwner[], leads: { ownerEmail: string | null }[]) {
  const assigned = new Set(leads.map(lead => ownerKey(lead.ownerEmail)).filter(Boolean));
  return crmOwnerOptions(team, leads).filter(option => assigned.has(option.value));
}
