import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { provisionAccount, type ProvisionResult } from "@/lib/provision-account";

// Backstop for the account-save auto-provisioning hook. Sweeps every active account
// that has a login email but is still missing a GoLogin profile, a proxy, or a share
// link, and provisions it. Also back-fills accounts whose profiles exist in GoLogin
// but were never linked in the DB, and retries anything the instant hook couldn't
// finish (GoLogin hiccup, or "no proxy free" once one is bought/freed). Never buys.
//
// Vercel Cron triggers with GET; POST is for manual runs. ?dryRun=1 reports without writing.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function run(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Auto-provisioning is opt-in — OFF by default so GoLogin profiles are only created
  // manually from the pipeline "Create GoLogin" button. Set AUTO_PROVISION_GOLOGIN=true
  // to re-enable the automatic sweep.
  if (process.env.AUTO_PROVISION_GOLOGIN !== "true") {
    return NextResponse.json({ ok: true, disabled: true, note: "Auto-provisioning is off (AUTO_PROVISION_GOLOGIN != true). Create GoLogin manually from the pipeline." });
  }
  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";

  const accounts = await prisma.linkedInAccount.findMany({
    where: {
      // Skip removed/retired, and never touch live rented accounts (a proxy/profile
      // change mid-rental would disrupt the client). Onboarding-stage accounts only.
      status: { notIn: ["removed", "retired", "rented"] },
      loginEmail: { not: null },
      OR: [{ gologinProfileId: null }, { proxyHost: null }, { gologinShareLink: null }],
    },
    select: { id: true },
  });

  const claimed = new Set<string>(); // don't over-fill an IP within a single pass
  const results: (ProvisionResult | { accountId: string; error: string })[] = [];
  for (const a of accounts) {
    try {
      results.push(await provisionAccount(a.id, { dryRun, claimed }));
    } catch (e) {
      results.push({ accountId: a.id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  const is = (r: (typeof results)[number]): r is ProvisionResult => "profile" in r;
  const summary = {
    scanned: accounts.length,
    profilesLinked: results.filter((r) => is(r) && r.profile === "linked").length,
    profilesCreated: results.filter((r) => is(r) && r.profile === "created").length,
    proxiesAssigned: results.filter((r) => is(r) && r.proxy === "assigned").length,
    flagged: results.filter((r) => is(r) && r.proxy === "flagged").length,
    shareLinksCreated: results.filter((r) => is(r) && r.shareLink === "created").length,
    withErrors: results.filter((r) => (is(r) ? r.errors.length > 0 : true)).length,
  };

  return NextResponse.json({ ok: true, dryRun, summary, results });
}

export async function GET(req: NextRequest) {
  return run(req);
}
export async function POST(req: NextRequest) {
  return run(req);
}
