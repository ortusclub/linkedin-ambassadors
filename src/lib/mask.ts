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
 * Strip identifying fields from a public account object: mask the name and
 * remove the profile URL + full-profile screenshot. The avatar photo is kept
 * (it makes listings look like real accounts) — names stay masked.
 */
export function maskPublicAccount<T extends object>(a: T): T {
  const out = { ...a } as Record<string, unknown>;
  if ("linkedinName" in out) out.linkedinName = maskName(out.linkedinName as string | null | undefined);
  if ("linkedinUrl" in out) out.linkedinUrl = null;
  if ("profileScreenshotUrl" in out) out.profileScreenshotUrl = null;
  // Derive a public "showcase" flag from the notes marker, then drop notes.
  const notes = out.notes;
  out.showcase = typeof notes === "string" && notes.includes("[SHOWCASE]");
  if ("notes" in out) delete out.notes;
  return out as T;
}
