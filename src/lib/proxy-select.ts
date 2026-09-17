import { getProxies } from "@/lib/proxies";

// Pick an available proxy from OUR pool for an account, by tier + capacity + country.
// Reuses getProxies() (the single source of truth) so capacity/country reflect exactly
// what /admin/proxies shows. Never buys — returns null when nothing fits, and the caller
// flags the account for a purchase.
//
// Capacity per IP (Sam's rules): proxy-cheap residential = 2, Proxy 6 datacenter = 3.
// accountCount from getProxies already counts every non-removed account on the host:port.

const CAP: Record<string, number> = { residential: 2, datacenter: 3 };

// Map the countries we actually stock (+ common variants) to an ISO2 code so a
// free-text account location can be compared to a proxy's country. Unknown strings
// yield null → treated as "no usable country" (assign any proxy of the tier).
const COUNTRY_ALIASES: Record<string, string> = {
  ph: "PH", philippines: "PH", manila: "PH", "metro manila": "PH",
  us: "US", usa: "US", "united states": "US", "united states of america": "US", america: "US",
  uk: "GB", gb: "GB", "united kingdom": "GB", "great britain": "GB", britain: "GB", england: "GB",
  sg: "SG", singapore: "SG",
  in: "IN", india: "IN",
  kh: "KH", cambodia: "KH",
  fr: "FR", france: "FR",
};

export function canonCountry(v?: string | null): string | null {
  if (!v) return null;
  const segs = v
    .split("·")[0]
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  for (const s of [...segs].reverse()) {
    if (COUNTRY_ALIASES[s]) return COUNTRY_ALIASES[s];
    if (/^[a-z]{2}$/.test(s) && Object.values(COUNTRY_ALIASES).includes(s.toUpperCase())) return s.toUpperCase();
  }
  const whole = v.trim().toLowerCase();
  return COUNTRY_ALIASES[whole] ?? null;
}

export type PickedProxy = {
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  country: string | null;
};

export async function pickAvailableProxy(opts: {
  provider: string; // "proxy-cheap" | "Proxy 6"
  type: string; // "residential" | "datacenter"
  country?: string | null; // the account's free-text location
  claimed?: Set<string>; // host:port already assigned earlier in this same run
}): Promise<PickedProxy | null> {
  const rows = await getProxies();
  const cap = CAP[opts.type.toLowerCase()] ?? 1;
  const wantCountry = canonCountry(opts.country);
  const claimed = opts.claimed ?? new Set<string>();

  const candidates = rows.filter((r) => {
    if (!r.provider || r.provider.toLowerCase() !== opts.provider.toLowerCase()) return false;
    if (!r.type || r.type.toLowerCase() !== opts.type.toLowerCase()) return false;
    if (r.status && ["retired", "error"].includes(r.status.toLowerCase())) return false;
    const key = `${r.host}:${r.port}`;
    const used = r.accountCount + (claimed.has(key) ? 1 : 0);
    return used < cap;
  });

  let pool = candidates;
  if (wantCountry) {
    pool = candidates.filter((r) => canonCountry(r.country) === wantCountry);
    if (pool.length === 0) return null;
  }
  if (pool.length === 0) return null;

  pool.sort((a, b) => a.accountCount - b.accountCount);
  const chosen = pool[0];
  claimed.add(`${chosen.host}:${chosen.port}`);

  const parts = chosen.proxyString.split(":");
  const username = parts.length >= 4 ? parts[2] : null;
  const password = parts.length >= 4 ? parts.slice(3).join(":") : null;
  return { host: chosen.host, port: chosen.port, username, password, country: chosen.country };
}
