import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Clear expired account holds (heldUntil in the past) so reserved accounts return to the
// catalogues once their 1–2 day window lapses. `heldUntil: null` is the "not held" test used by
// PUBLIC_AVAILABLE_WHERE and the unlisted catalogue queries, so nulling it is the release.
export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await prisma.linkedInAccount.updateMany({
    where: { heldUntil: { lt: new Date() } },
    data: { heldUntil: null, heldFor: null, heldBy: null, heldAt: null },
  });
  return NextResponse.json({ ok: true, released: res.count });
}

// Vercel Cron triggers with GET — alias to POST so the job runs.
export async function GET(req: NextRequest) {
  return POST(req);
}
