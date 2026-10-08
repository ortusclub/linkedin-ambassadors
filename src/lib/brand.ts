// Brand config — one app, two public fronts, one backend.
//
// The same klabber app serves linkedvelocity.com AND linkedarmy.com. The DATA layer
// (accounts, catalogue, rentals, admin) is shared and un-branded; only the WRAPPING
// differs per host: name, logo, colours, sender email, SEO metadata, and the
// rent-vs-hire terminology. Resolve the brand from the request host and read
// everything customer-facing from the object this returns — never hardcode a brand
// string in a page again.
//
// Adding a third front later is a new entry in BRANDS + HOST_TO_BRAND, nothing else.

export type BrandId = "linkedvelocity" | "linkedarmy";

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
  noun: string; // "account" | "operator"
  nounPlural: string; // "accounts" | "operators"
  catalogue: string; // "Catalogue" | "Roster"
  browse: string; // nav label: "Browse Accounts" | "Meet Operators"
  slogan: string; // footer small-caps line
  footerBlurb: string; // footer one-liner
  earnCta: string; // "Earn passive income sharing it" | "Earn as an operator"
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
    browse: "Browse Accounts",
    slogan: "Accelerate your network",
    footerBlurb:
      "Rent warmed-up LinkedIn accounts for outreach — or earn by sharing one you no longer use.",
    earnCta: "Earn passive income sharing it",
    tagline: "Scale LinkedIn outreach without the limits",
  },
};

// LinkedArmy — SAME LinkedVelocity layout + product, worded as "hire a LinkedIn Operator"
// instead of "rent an account" (subtle, compliant-sounding; Sam's direction). To switch the
// public noun to "LinkedIn support", change noun/nounPlural/browse below.
// TODO(assets): add /public/linkedarmy-mark.png (nav/footer render a CSS mark meanwhile).
const linkedarmy: Brand = {
  id: "linkedarmy",
  name: "LinkedArmy",
  legalName: "LinkedArmy",
  domain: "linkedarmy.com",
  url: "https://linkedarmy.com",
  fromEmail: "LinkedArmy <noreply@linkedarmy.com>",
  adminEmail: "info@linkedarmy.com",
  supportTelegram: "@linkedarmy_support_bot",
  logo: "/linkedarmy-mark.png",
  favicon: "/favicon.svg", // reuse the generic mark until a LinkedArmy favicon asset exists
  ogImage: "/brand-og", // generated OG image (src/app/brand-og) — no static asset needed
  palette: { primary: "#0A66C2", ink: "#1D1B16" },
  meta: {
    titleDefault: "LinkedArmy — Hire Verified LinkedIn Operators for Outreach",
    titleTemplate: "%s | LinkedArmy",
    description:
      "Hire verified LinkedIn Operators with established networks to run your outreach and hit pipeline targets. Month to month, cancel anytime.",
    keywords: [
      "hire LinkedIn operator",
      "LinkedIn operators",
      "LinkedIn outreach",
      "LinkedIn lead generation",
      "B2B outreach",
      "done-for-you LinkedIn outreach",
      "LinkedIn campaigns",
      "LinkedIn marketing support",
    ],
    ogTitle: "LinkedArmy — Hire Verified LinkedIn Operators for Outreach",
    ogDescription:
      "Hire verified LinkedIn Operators with established networks to run your outreach and hit pipeline targets. Month to month.",
    ogImageAlt: "LinkedArmy — Hire verified LinkedIn Operators",
    twitterTitle: "LinkedArmy — Hire LinkedIn Operators",
    twitterDescription:
      "Hire verified LinkedIn Operators to run your outreach. Month to month, cancel anytime.",
  },
  term: {
    verb: "Hire",
    verbLower: "hire",
    noun: "operator",
    nounPlural: "operators",
    catalogue: "Catalogue",
    browse: "Browse Operators",
    slogan: "Accelerate your network",
    footerBlurb:
      "Hire verified LinkedIn Operators with established networks to run your outreach — or become an operator and earn.",
    earnCta: "Become an operator",
    tagline: "Hire verified LinkedIn Operators for outreach.",
  },
};

export const BRANDS: Record<BrandId, Brand> = { linkedvelocity, linkedarmy };

// Unknown hosts (previews, localhost, vercel.app) fall back to LinkedVelocity so
// existing behaviour is unchanged everywhere except the two known public domains.
export const DEFAULT_BRAND: Brand = linkedvelocity;

const HOST_TO_BRAND: Record<string, BrandId> = {
  "linkedvelocity.com": "linkedvelocity",
  "linkedarmy.com": "linkedarmy",
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
// preview URLs like linkedarmy-com-xxx.vercel.app still theme correctly during testing.
export function brandForHost(host?: string | null): Brand {
  const h = normalizeHost(host);
  const exact = HOST_TO_BRAND[h];
  if (exact) return BRANDS[exact];
  if (h.includes("linkedarmy")) return linkedarmy;
  if (h.includes("linkedvelocity")) return linkedvelocity;
  return DEFAULT_BRAND;
}

const CANONICAL_HOSTS = new Set(["linkedvelocity.com", "linkedarmy.com"]);

function isCanonicalHost(host?: string | null): boolean {
  return CANONICAL_HOSTS.has(normalizeHost(host));
}

// Server-component / metadata resolver. Reads the incoming host from request headers.
// On a real brand domain the host always wins (SEO-safe). On any OTHER host (Vercel
// preview, localhost) a `?brand=` override — carried as the x-brand-override header set
// by middleware, or the brand_override cookie — lets us demo either brand.
export async function getBrand(): Promise<Brand> {
  const { headers, cookies } = await import("next/headers");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!isCanonicalHost(host)) {
    const fromHeader = h.get("x-brand-override");
    if (fromHeader && fromHeader in BRANDS) return BRANDS[fromHeader as BrandId];
    const fromCookie = (await cookies()).get("brand_override")?.value;
    if (fromCookie && fromCookie in BRANDS) return BRANDS[fromCookie as BrandId];
  }
  return brandForHost(host);
}

// Brand for a route-handler Request (API routes get the raw Request).
export function brandFromRequest(req: Request): Brand {
  return brandForHost(req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
}

// Absolute base URL for the SAME domain the request came in on. Use this for Stripe
// return URLs, email links, etc. so a linkedarmy.com customer is never bounced to
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
