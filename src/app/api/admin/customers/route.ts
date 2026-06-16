import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const customers = await prisma.user.findMany({
      where: { role: "customer" },
      include: {
        rentals: {
          select: { id: true, status: true },
        },
        _count: {
          select: { rentals: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Look up payment methods from ambassador applications
    const emails = customers.map((c) => c.email);
    const applications = emails.length > 0
      ? await prisma.ambassadorApplication.findMany({
          where: { email: { in: emails } },
          select: { email: true, paymentMethod: true },
          orderBy: { createdAt: "desc" },
        })
      : [];

    const paymentMap = new Map<string, string>();
    for (const app of applications) {
      if (app.paymentMethod && !paymentMap.has(app.email)) {
        paymentMap.set(app.email, app.paymentMethod);
      }
    }

    const result = customers.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      email: c.email,
      contactNumber: c.contactNumber,
      status: c.status,
      createdAt: c.createdAt,
      activeRentals: c.rentals.filter((r) => r.status === "active").length,
      totalRentals: c._count.rentals,
      paymentMethod: paymentMap.get(c.email) || "crypto_wallet",
      paymentDetails: c.paymentDetails || "",
    }));

    return NextResponse.json({ customers: result });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Permanently delete a customer + everything tied to them (sessions, transactions,
// rentals, waitlist, deposit address, ambassador applications, verification codes),
// freeing any accounts they were renting. Admins cannot be deleted here.
export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, rentals: { select: { linkedinAccountId: true } } },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.role === "admin") {
      return NextResponse.json({ error: "Admins can't be deleted from here." }, { status: 400 });
    }

    const accountIds = [...new Set(user.rentals.map((r) => r.linkedinAccountId))];

    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({ where: { userId: id } });
      await tx.rental.deleteMany({ where: { userId: id } });
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.waitlist.deleteMany({ where: { userId: id } });
      await tx.depositAddress.deleteMany({ where: { userId: id } }).catch(() => {});
      await tx.ambassadorApplication.deleteMany({ where: { email: user.email } }).catch(() => {});
      await tx.verificationCode.deleteMany({ where: { email: user.email } }).catch(() => {});
      await tx.user.delete({ where: { id } });

      // Free any account that no longer has an active/pending rental.
      for (const aid of accountIds) {
        const stillRented = await tx.rental.count({
          where: { linkedinAccountId: aid, status: { in: ["active", "pending_access"] } },
        });
        if (stillRented === 0) {
          await tx.linkedInAccount.updateMany({ where: { id: aid, status: "rented" }, data: { status: "available" } });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    console.error("Delete customer error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();

    const { email, paymentMethod, paymentDetails } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    // Update payment method on ambassador application
    if (paymentMethod) {
      const application = await prisma.ambassadorApplication.findFirst({
        where: { email },
        orderBy: { createdAt: "desc" },
      });

      if (application) {
        await prisma.ambassadorApplication.update({
          where: { id: application.id },
          data: { paymentMethod },
        });
      } else {
        await prisma.ambassadorApplication.create({
          data: {
            fullName: email,
            email,
            linkedinUrl: "",
            status: "pending",
            paymentMethod,
          },
        });
      }
    }

    // Update payment details on user
    if (paymentDetails !== undefined) {
      await prisma.user.update({
        where: { email },
        data: { paymentDetails: paymentDetails || null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
