// Unlisted catalogues whose viewers can self-serve "Reserve" an account (a short hold). Keyed by
// the catalogue's unguessable slug. The public catalogue and ProfilePartner are NOT here — only
// admins hold on their behalf. Add the Will Cura events catalogue's slug here when it's built
// (same Agent360 pattern) and it inherits Reserve automatically.
export const RESERVABLE_CATALOGUES: Record<string, { label: string; tag: string }> = {
  "iv-a360-9mq2k7xz4p": { label: "Agent360", tag: "agent360" },
};

export const reservableCatalogue = (slug: string) => RESERVABLE_CATALOGUES[slug] ?? null;
