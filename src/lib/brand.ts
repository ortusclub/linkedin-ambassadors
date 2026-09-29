// Brand config — one app, two public fronts, one backend.
//
// The same klabber app serves linkedvelocity.com AND linkedreps.io. The DATA layer
// (accounts, catalogue, rentals, admin) is shared and un-branded; only the WRAPPING
// differs per host: name, logo, colours, sender email, SEO metadata, and the
// rent-vs-ambassador terminology. Resolve the brand from the request host and read
// everything customer-facing from the object this returns — never hardcode a brand
// string in a page again.
//
// Adding a third front later is a new entry in BRANDS + HOST_TO_BRAND, nothing else.

export type BrandId = "linkedvelocity" | "linkedreps";

export interface BrandMeta {
  titleDefault: string;
  titleTemplate: string; // e.g. "%s | LinkedVelocity"
  description: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImageAlt: string;
  twitterTitle: string;
  twitterDescription: string;
}

// Terminology dictionary for the "different wrapping". Marketing/FAQ/pricing copy is
// still inline across many pages today; as those get refactored they should read these
// instead of literal "rent"/"account" strings so both brands stay consistent.
export interface BrandTerm {
  verb: string; // "Rent" | "Hire"
  verbLower: string; // "rent" | "hire"
  noun: string; // "account" | "ambassador"
  nounPlural: string; // "accounts" | "ambassadors"
  catalogue: string; // "Catalogue" | "Roster"
  tagline: string;
}

export interface Brand {
  id: BrandId;
  name: string;
  legalName: string;
  domain: string; // bare host, no protocol
  url: string; // https://<domain>
  fromEmail: string; // Resend "from" (name + address)
  adminEmail: string; // internal notification inbox for this brand
  supportTelegram: string; // support handle / bot
  logo: string; // /public path
  favicon: string;
  ogImage: string;
  palette: { primary: string; ink: string };
  meta: BrandMeta;
  term: BrandTerm;
}

// LinkedVelocity — the existing rental-honest brand. These strings are intentionally
// identical to the previous hardcoded layout.tsx metadata so LV output is unchanged.
const linkedvelocity: Brand = {
  id: "linkedvelocity",
  name: "LinkedVelocity",
  legalName: "LinkedVelocity",
  domain: "linkedvelocity.com",
  url: "https://linkedvelocity.com",
  fromEmail: "LinkedVelocity <noreply@linkedvelocity.com>",
  adminEmail: "info@linkedvelocity.com",
  supportTelegram: "@linkedvelocity_support_bot",
  logo: "/linkedvelocity-mark.png",
  favicon: "/favicon.svg",
  ogImage: "/og-image.png?v=2",
  palette: { primary: "#0A66C2", ink: "#1D1B16" },
  meta: {
    titleDefault: "LinkedVelocity — Rent Premium LinkedIn Accounts for Outreach",
    titleTemplate: "%s | LinkedVelocity",
    description:
      "Rent pre-warmed, verified LinkedIn accounts for outreach, lead generation, and networking. Instant access via GoLogin browser. Cancel anytime. From $45/month.",
    keywords: [
      "rent LinkedIn account",
      "LinkedIn account rental",
      "LinkedIn outreach",
      "LinkedIn lead generation",
      "buy LinkedIn accounts",
      "LinkedIn account marketplace",
      "GoLogin LinkedIn",
      "LinkedIn automation",
      "B2B outreach",
      "sales prospecting LinkedIn",
    ],
    ogTitle: "LinkedVelocity — Rent Premium LinkedIn Accounts for Outreach",
    ogDescription:
      "Rent pre-warmed, verified LinkedIn accounts for outreach and lead generation. Instant access, cancel anytime. From $45/month.",
    ogImageAlt: "LinkedVelocity — Scale LinkedIn outreach without the limits",
    twitterTitle: "LinkedVelocity — Rent Premium LinkedIn Accounts",
    twitterDescription:
      "Rent pre-warmed LinkedIn accounts for outreach and lead gen. Instant access, cancel anytime.",
  },
  term: {
    verb: "Rent",
    verbLower: "rent",
    noun: "account",
    nounPlural: "accounts",
    catalogue: "Catalogue",
    tagline: "Scale LinkedIn outreach without the limits",
  },
};

// LinkedReps — the ambassador-front brand. Same product, "hire an ambassador" wrapping.
// TODO(assets): add /public/linkedreps-mark.png, /public/linkedreps-favicon.svg and
// /public/linkedreps-og.png before pointing DNS live, or these fall back to 404.
const linkedreps: Brand = {
  id: "linkedreps",
  name: "LinkedReps",
  legalName: "LinkedReps",
  domain: "linkedreps.io",
  url: "https://linkedreps.io",
  fromEmail: "LinkedReps <noreply@linkedreps.io>",
  adminEmail: "info@linkedreps.io",
  supportTelegram: "@linkedreps_support_bot",
  logo: "/linkedreps-mark.png",
  favicon: "/linkedreps-favicon.svg",
  ogImage: "/linkedreps-og.png",
  palette: { primary: "#0B7285", ink: "#161A1D" },
  meta: {
    titleDefault: "LinkedReps — Hire LinkedIn Ambassadors for B2B Outreach",
    titleTemplate: "%s | LinkedReps",
    description:
      "Hire real LinkedIn ambassadors with established networks who run your outreach. One seat or a whole team, month to month.",
    keywords: [
      "hire LinkedIn ambassador",
      "LinkedIn SDR",
      "LinkedIn outreach service",
      "outsourced LinkedIn outreach",
      "LinkedIn lead generation",
      "done for you LinkedIn",
      "B2B outreach",
      "LinkedIn outreach partners",
    ],
    ogTitle: "LinkedReps — Hire LinkedIn Ambassadors for B2B Outreach",
    ogDescription:
      "Hire real LinkedIn ambassadors with established networks who run your outreach. One seat or a whole team, month to month.",
    ogImageAlt: "LinkedReps — Don't build a network. Hire one.",
    twitterTitle: "LinkedReps — Hire LinkedIn Ambassadors",
    twitterDescription:
      "Hire real LinkedIn ambassadors with established networks who run your outreach. Month to month.",
  },
  term: {
    verb: "Hire",
    verbLower: "hire",
    noun: "ambassador",
    nounPlural: "ambassadors",
    catalogue: "Roster",
    tagline: "Don't build a network. Hire one.",
  },
};

export const BRANDS: Record<BrandId, Brand> = { linkedvelocity, linkedreps };

// Unknown hosts (previews, localhost, vercel.app) fall back to LinkedVelocity so
// existing behaviour is unchanged everywhere except the two known public domains.
export const DEFAULT_BRAND: Brand = linkedvelocity;

const HOST_TO_BRAND: Record<string, BrandId> = {
  "linkedvelocity.com": "linkedvelocity",
  "linkedreps.io": "linkedreps",
};

function normalizeHost(host?: string | null): string {
  return (host || "")
    .toLowerCase()
    .split(",")[0] // x-forwarded-host can be a list
    .trim()
    .replace(/:\d+$/, "") // strip port
    .replace(/^www\./, "");
}

// Pure resolver: host string -> Brand. Exact match first, then a loose "contains" so
// preview URLs like linkedreps-io-xxx.vercel.app still theme correctly during testing.
export function brandForHost(host?: string | null): Brand {
  const h = normalizeHost(host);
  const exact = HOST_TO_BRAND[h];
  if (exact) return BRANDS[exact];
  if (h.includes("linkedreps")) return linkedreps;
  if (h.includes("linkedvelocity")) return linkedvelocity;
  return DEFAULT_BRAND;
}

// Server-component / metadata resolver. Reads the incoming host from request headers.
export async function getBrand(): Promise<Brand> {
  const { headers } = await import("next/headers");
  const h = await headers();
  return brandForHost(h.get("x-forwarded-host") ?? h.get("host"));
}

// Brand for a route-handler Request (API routes get the raw Request).
export function brandFromRequest(req: Request): Brand {
  return brandForHost(req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
}

// Absolute base URL for the SAME domain the request came in on. Use this for Stripe
// return URLs, email links, etc. so a linkedreps.io customer is never bounced to
// linkedvelocity.com. Falls back to env, then the default brand.
export function baseUrlFromRequest(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto =
      req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host.split(",")[0].trim()}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || DEFAULT_BRAND.url;
}
