// Restriction analytics: turns the per-account restrictionLog (append-only history of
// "restricted"/"recovered" events, see src/lib/restriction.ts) plus account + application
// facts into the cohort breakdowns shown on /admin/restrictions. Pure functions — the API
// route does the prisma reads and hands the rows in, so this stays easy to reason about.
//
// CAVEAT the UI surfaces: restrictionLog is recent, so a restrict→recover that happened
// before logging existed (restrictedAt already cleared, empty log) is invisible here. Rates
// are exact going forward; older history is undercounted.

export type RestrictionEvent = {
  at: string;
  event: "restricted" | "recovered";
  note?: string;
  creditedDays?: number;
};

export type AnalyticsAccount = {
  id: string;
  linkedinName: string;
  linkedinUrl: string | null;
  linkedinVerified: boolean;
  restrictedAt: Date | string | null;
  restrictionLog: unknown;
  connectionCount: number;
  accountAgeMonths: number | null;
  loginEmail: string | null;
  workEmail: string | null;
  proxyHost: string | null;
  proxyLocation: string | null;
  status: string;
  notes: string | null;
};

export type AnalyticsApp = {
  linkedinUrl: string | null;
  email: string;
  onboardedAt: Date | string | null;
  verifiedAt: Date | string | null;
};

export type CohortRow = {
  bucket: string;
  total: number;
  restricted: number; // ever restricted
  restrictionRate: number; // restricted / total
  recovered: number;
  open: number; // currently restricted
  recoveryRate: number | null; // recovered / (recovered + open), null if none restricted
};

export type FeedItem = {
  at: string;
  event: "restricted" | "recovered";
  account: string;
  note?: string;
  creditedDays?: number;
};

export type RestrictionAnalytics = {
  generatedAt: string;
  totals: {
    accounts: number;
    everRestricted: number;
    everRestrictedRate: number;
    open: number; // currently restricted
    recovered: number;
    recoveryRate: number | null; // recovered / everRestricted
    repeatRestricted: number; // restricted 2+ times
    loggedEvents: number; // total events in all logs
    avgDaysToRecover: number | null;
    medianDaysToRecover: number | null;
    avgOpenDays: number | null; // avg downtime of currently-open restrictions
  };
  cohorts: {
    verified: CohortRow[];
    lifecycle: CohortRow[];
    proxy: CohortRow[];
    proxyGeo: CohortRow[];
    age: CohortRow[];
    connections: CohortRow[];
    emailDomain: CohortRow[];
  };
  timing: CohortRow[]; // restriction timing relative to onboarding (denominator = ever-restricted)
  feed: FeedItem[];
};

const DAY = 86400000;

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function parseLog(raw: unknown): RestrictionEvent[] {
  if (!Array.isArray(raw)) return [];
  return (raw as RestrictionEvent[])
    .filter((e) => e && (e.event === "restricted" || e.event === "recovered") && typeof e.at === "string")
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at));
}

// Per-account restriction facts derived from the log + the current open flag.
type AcctFacts = {
  everRestricted: boolean;
  open: boolean; // currently restricted
  recovered: boolean; // was restricted, now clear
  restrictCount: number;
  firstRestrictedAt: Date | null;
  completedDowntimeDays: number[]; // one per restrict→recover pair
  openDays: number | null; // downtime of the current open restriction
};

function acctFacts(a: AnalyticsAccount, now: number): AcctFacts {
  const events = parseLog(a.restrictionLog);
  const openNow = !!toDate(a.restrictedAt);
  const restrictEvents = events.filter((e) => e.event === "restricted");

  // Pair restricted→recovered in order to measure downtime of completed cycles.
  const completed: number[] = [];
  let openSince: Date | null = null;
  for (const e of events) {
    const d = toDate(e.at);
    if (!d) continue;
    if (e.event === "restricted") {
      if (!openSince) openSince = d;
    } else if (e.event === "recovered" && openSince) {
      completed.push(Math.max(0, d.getTime() - openSince.getTime()) / DAY);
      openSince = null;
    }
  }

  // everRestricted: the log has restrict events, OR it's flagged restricted now even if the
  // log predates logging (older open restrictions have restrictedAt but maybe no event).
  const everRestricted = restrictEvents.length > 0 || openNow;
  const firstRestrictedAt = restrictEvents[0] ? toDate(restrictEvents[0].at) : toDate(a.restrictedAt);

  let openDays: number | null = null;
  if (openNow) {
    const since = openSince || toDate(a.restrictedAt);
    if (since) openDays = Math.max(0, now - since.getTime()) / DAY;
  }

  const restrictCount = Math.max(restrictEvents.length, openNow ? 1 : 0);

  return {
    everRestricted,
    open: openNow,
    recovered: everRestricted && !openNow,
    restrictCount,
    firstRestrictedAt,
    completedDowntimeDays: completed,
    openDays,
  };
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Build a cohort table: for each bucket, how many accounts and what share were restricted /
// recovered. keyFn returns the bucket label, or null to drop the account from this cohort.
function cohort(
  accounts: { a: AnalyticsAccount; f: AcctFacts }[],
  keyFn: (a: AnalyticsAccount, f: AcctFacts) => string | null,
  order?: string[],
): CohortRow[] {
  const map = new Map<string, { total: number; restricted: number; recovered: number; open: number }>();
  for (const { a, f } of accounts) {
    const k = keyFn(a, f);
    if (k == null) continue;
    const row = map.get(k) || { total: 0, restricted: 0, recovered: 0, open: 0 };
    row.total += 1;
    if (f.everRestricted) row.restricted += 1;
    if (f.recovered) row.recovered += 1;
    if (f.open) row.open += 1;
    map.set(k, row);
  }
  let rows = Array.from(map.entries()).map(([bucket, r]) => ({
    bucket,
    total: r.total,
    restricted: r.restricted,
    restrictionRate: r.total ? r.restricted / r.total : 0,
    recovered: r.recovered,
    open: r.open,
    recoveryRate: r.restricted ? r.recovered / r.restricted : null,
  }));
  if (order) {
    rows = rows.sort((a, b) => {
      const ia = order.indexOf(a.bucket);
      const ib = order.indexOf(b.bucket);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return b.total - a.total;
    });
  } else {
    rows = rows.sort((a, b) => b.restricted - a.restricted || b.total - a.total);
  }
  return rows;
}

const domainOf = (email: string | null): string | null => {
  if (!email) return null;
  const at = email.indexOf("@");
  return at === -1 ? null : email.slice(at + 1).toLowerCase().trim() || null;
};

// A rough country/region token out of the free-text proxyLocation ("US", "United States ·
// New York", "PH - proxy-cheap"). We take the leading segment before a separator.
const geoOf = (loc: string | null): string | null => {
  if (!loc) return null;
  const first = loc.split(/[·|,\-/]/)[0].trim();
  return first || null;
};

const ageBucket = (m: number | null): string => {
  if (m == null) return "Unknown";
  if (m < 3) return "< 3 mo";
  if (m < 6) return "3–6 mo";
  if (m < 12) return "6–12 mo";
  if (m < 24) return "1–2 yr";
  return "2 yr+";
};
const AGE_ORDER = ["< 3 mo", "3–6 mo", "6–12 mo", "1–2 yr", "2 yr+", "Unknown"];

const connBucket = (c: number): string => {
  if (c < 100) return "0–99";
  if (c < 300) return "100–299";
  if (c < 500) return "300–499";
  if (c < 1000) return "500–999";
  if (c < 5000) return "1,000–4,999";
  return "5,000+";
};
const CONN_ORDER = ["0–99", "100–299", "300–499", "500–999", "1,000–4,999", "5,000+"];

export function computeRestrictionAnalytics(
  accountsIn: AnalyticsAccount[],
  appsIn: AnalyticsApp[],
  now: number = Date.now(),
): RestrictionAnalytics {
  // Match an account to its application the same way the rest of admin does: by unique
  // LinkedIn URL first, then a unique "Owner: <email>" line in the account notes.
  const normUrl = (u?: string | null) => (u || "").split("?")[0].replace(/\/+$/, "").toLowerCase().trim();
  const appByUrl = new Map<string, AnalyticsApp>();
  for (const app of appsIn) {
    const u = normUrl(app.linkedinUrl);
    if (u && !appByUrl.has(u)) appByUrl.set(u, app);
  }
  const appByEmail = new Map<string, AnalyticsApp>();
  const emailCount = new Map<string, number>();
  for (const app of appsIn) {
    const e = app.email.toLowerCase();
    emailCount.set(e, (emailCount.get(e) || 0) + 1);
    if (!appByEmail.has(e)) appByEmail.set(e, app);
  }
  const appFor = (a: AnalyticsAccount): AnalyticsApp | null => {
    const u = normUrl(a.linkedinUrl);
    if (u && appByUrl.has(u)) return appByUrl.get(u)!;
    const owner = (a.notes || "").match(/Owner:\s*(\S+@\S+)/)?.[1]?.replace(/\.$/, "")?.toLowerCase();
    if (owner && emailCount.get(owner) === 1) return appByEmail.get(owner) || null;
    return null;
  };

  const accounts = accountsIn.map((a) => ({ a, f: acctFacts(a, now) }));

  // Totals.
  let everRestricted = 0, open = 0, recovered = 0, repeat = 0, loggedEvents = 0;
  const downtimes: number[] = [];
  const openDaysArr: number[] = [];
  for (const { a, f } of accounts) {
    if (f.everRestricted) everRestricted += 1;
    if (f.open) open += 1;
    if (f.recovered) recovered += 1;
    if (f.restrictCount >= 2) repeat += 1;
    downtimes.push(...f.completedDowntimeDays);
    if (f.openDays != null) openDaysArr.push(f.openDays);
    loggedEvents += parseLog(a.restrictionLog).length;
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

  // Lifecycle stage cohort.
  const lifecycle = cohort(
    accounts,
    (a) => {
      const app = appFor(a);
      if (a.linkedinVerified || toDate(app?.verifiedAt ?? null)) return "Verified";
      if (toDate(app?.onboardedAt ?? null) || a.loginEmail) return "Onboarded / logged in";
      return "Pre-onboarding";
    },
    ["Pre-onboarding", "Onboarded / logged in", "Verified"],
  );

  // Restriction timing relative to onboarding — denominator is ever-restricted accounts only.
  const restrictedAccounts = accounts.filter(({ f }) => f.everRestricted);
  const timing = cohort(
    restrictedAccounts,
    (a, f) => {
      const app = appFor(a);
      const onb = toDate(app?.onboardedAt ?? null);
      const when = f.firstRestrictedAt;
      if (!onb || !when) return "No onboarding date";
      const d = (when.getTime() - onb.getTime()) / DAY;
      if (d < 0) return "Before onboarding";
      if (d < 7) return "0–7 days after";
      if (d < 30) return "7–30 days after";
      return "30+ days after";
    },
    ["Before onboarding", "0–7 days after", "7–30 days after", "30+ days after", "No onboarding date"],
  );

  // Email domain cohort — group tiny domains together to keep the table readable.
  const rawDomain = cohort(accounts, (a) => domainOf(a.loginEmail) || domainOf(a.workEmail));
  const bigDomains = new Set(rawDomain.filter((r) => r.total >= 3).map((r) => r.bucket));
  const emailDomain = cohort(accounts, (a) => {
    const d = domainOf(a.loginEmail) || domainOf(a.workEmail);
    if (!d) return "No login email";
    return bigDomains.has(d) ? d : "Other domains";
  });

  const feed: FeedItem[] = [];
  for (const { a } of accounts) {
    for (const e of parseLog(a.restrictionLog)) {
      feed.push({ at: e.at, event: e.event, account: a.linkedinName, ...(e.note ? { note: e.note } : {}), ...(e.creditedDays ? { creditedDays: e.creditedDays } : {}) });
    }
  }
  feed.sort((x, y) => y.at.localeCompare(x.at));

  return {
    generatedAt: new Date(now).toISOString(),
    totals: {
      accounts: accounts.length,
      everRestricted,
      everRestrictedRate: accounts.length ? everRestricted / accounts.length : 0,
      open,
      recovered,
      recoveryRate: everRestricted ? recovered / everRestricted : null,
      repeatRestricted: repeat,
      loggedEvents,
      avgDaysToRecover: avg(downtimes),
      medianDaysToRecover: median(downtimes),
      avgOpenDays: avg(openDaysArr),
    },
    cohorts: {
      verified: cohort(accounts, (a) => (a.linkedinVerified ? "Verified" : "Unverified"), ["Verified", "Unverified"]),
      lifecycle,
      proxy: cohort(accounts, (a) => (a.proxyHost ? "Has proxy" : "No proxy"), ["Has proxy", "No proxy"]),
      proxyGeo: cohort(accounts, (a) => (a.proxyHost ? geoOf(a.proxyLocation) || "Proxy · geo unknown" : null)),
      age: cohort(accounts, (a) => ageBucket(a.accountAgeMonths), AGE_ORDER),
      connections: cohort(accounts, (a) => connBucket(a.connectionCount), CONN_ORDER),
      emailDomain,
    },
    timing,
    feed: feed.slice(0, 60),
  };
}
