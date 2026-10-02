import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

// Bulk-assign the LV handler (PoC) on many applications at once — e.g. hand every Level-1
// application to a new team member. `poc` is free text (null clears). Admin-only.
const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(1000),
  poc: z.string().max(80).nullable(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const poc = parsed.data.poc?.trim() || null;
    const r = await prisma.ambassadorApplication.updateMany({
      where: { id: { in: parsed.data.ids } },
      data: { poc },
    });
    return NextResponse.json({ ok: true, updated: r.count });
  } catch (e) {
    if (e instanceof Error && (e.message === "Forbidden" || e.message === "Unauthorized")) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
