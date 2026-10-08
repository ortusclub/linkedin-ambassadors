import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type RestrictionEvent = { at: string; event: string; note?: string };

// Admin log of self-serve replacements: each row is a NEW rental that replaced a restricted
// one — original account -> restricted date -> replacement account -> renter -> when.
export async function GET() {
  try {
    await requireAdmin();

    const rows = await prisma.rental.findMany({
      where: { replacesRentalId: { not: null } },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        linkedinAccount: { select: { id: true, linkedinName: true, linkedinUrl: true } },
        replaces: {
          select: {
            id: true,
            linkedinAccount: { select: { id: true, linkedinName: true, linkedinUrl: true, restrictedAt: true, restrictionLog: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const replacements = rows.map((r) => {
      const oldAcct = r.replaces?.linkedinAccount;
      // Restricted date = the most recent "restricted" event on the old account (fall back to
      // its current restrictedAt if the log isn't available).
      let restrictedAt: string | null = oldAcct?.restrictedAt ? new Date(oldAcct.restrictedAt).toISOString() : null;
      const log = (oldAcct?.restrictionLog as RestrictionEvent[] | null) || [];
      const lastRestrict = Array.isArray(log) ? [...log].reverse().find((e) => e?.event === "restricted") : undefined;
      if (lastRestrict?.at) restrictedAt = lastRestrict.at;

      return {
        id: r.id,
        at: r.createdAt,
        renter: { id: r.user.id, name: r.user.fullName, email: r.user.email },
        original: oldAcct ? { id: oldAcct.id, name: oldAcct.linkedinName, url: oldAcct.linkedinUrl } : null,
        restrictedAt,
        replacement: { id: r.linkedinAccount.id, name: r.linkedinAccount.linkedinName, url: r.linkedinAccount.linkedinUrl },
        replacementStatus: r.status,
      };
    });

    return NextResponse.json({ replacements });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    console.error("admin replacements error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
