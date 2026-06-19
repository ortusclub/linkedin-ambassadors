// Public-facing masking for LinkedIn accounts.
// Goal: never expose anything that lets an outsider (e.g. LinkedIn) identify
// the real account from our public pages/APIs/structured data.
// We keep the *selling* info (connections, industry, location, age, price) but
// strip/mask the direct identifiers.

/** "Anne Portia Salas" -> "Anne S."  ·  "(TEST)" suffixes stripped. */
export function maskName(name: string | null | undefined): string {
  if (!name) return "Verified member";
  const clean = name.replace(/\s*\(.*\)\s*$/, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Verified member";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/**
 * Prepare an account for public display. Per Sam's decision, listings now show the
 * full identity — real name, profile URL (so customers can click through to the real
 * LinkedIn profile), and screenshot. We still strip the internal `notes` field, but
 * surface the showcase flag derived from it. (maskName is kept for any internal use.)
 */
export function maskPublicAccount<T extends object>(a: T): T {
  const out = { ...a } as Record<string, unknown>;
  // Derive a public "showcase" flag from the notes marker, then drop the internal notes.
  const notes = out.notes;
  out.showcase = typeof notes === "string" && notes.includes("[SHOWCASE]");
  if ("notes" in out) delete out.notes;
  return out as T;
}
