import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Permanently delete a rental record (admin cleanup). Removes its transactions
// and frees the account if nothing else is actively renting it.
// This is different from "End" (which keeps the record, marked cancelled).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const rental = await prisma.rental.findUnique({
      where: { id },
      select: { id: true, linkedinAccountId: true },
    });
    if (!rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({ where: { rentalId: id } });
      await tx.rental.delete({ where: { id } });

      // Free the account if no other active/pending rental holds it.
      const stillRented = await tx.rental.count({
        where: { linkedinAccountId: rental.linkedinAccountId, status: { in: ["active", "pending_access"] } },
      });
      if (stillRented === 0) {
        await tx.linkedInAccount.updateMany({
          where: { id: rental.linkedinAccountId, status: "rented" },
          data: { status: "available" },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    console.error("Delete rental error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
