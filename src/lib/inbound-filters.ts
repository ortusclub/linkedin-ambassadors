export const INBOUND_TYPES = ["Telegram", "Booked Call", "Email", "Referral", "Website", "WhatsApp", "Other"];
export const INBOUND_DESTINATIONS = [
  { key: "addedToAmbassadorPipeline", label: "Added to Ambassador Pipeline" },
  { key: "addedToReferralPipeline", label: "Added to Referral Pipeline" },
  { key: "addedToClientCrm", label: "Added to Client CRM" },
] as const;
export type InboundDestination = typeof INBOUND_DESTINATIONS[number]["key"];
export type InboundRouting = Partial<Record<InboundDestination, boolean>>;
export function inboundType(channel: string) {
  const key = channel.trim().toLowerCase();
  if (["call", "call booking", "booked call", "booking"].includes(key)) return "Booked Call";
  if (["referral", "referrals"].includes(key)) return "Referral";
  return INBOUND_TYPES.find(type => type.toLowerCase() === key) || "Other";
}
export function inboundStatuses(lead: InboundRouting): string[] {
  const statuses = INBOUND_DESTINATIONS.filter(item => lead[item.key]).map(item => item.key);
  return statuses.length ? statuses : ["new"];
}
export function matchesInboundStatus(lead: InboundRouting, statuses: string[]) {
  return statuses.length === 0 || inboundStatuses(lead).some(status => statuses.includes(status));
}
