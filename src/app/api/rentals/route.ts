import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();

    const rentals = await prisma.rental.findMany({
      where: { userId: user.id },
      include: {
        linkedinAccount: {
          select: {
            id: true,
            linkedinName: true,
            linkedinHeadline: true,
            linkedinUrl: true,
            loginEmail: true,
            profilePhotoUrl: true,
            connectionCount: true,
            gologinShareLink: true,
            restrictedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Renter-facing: surface the sign-in email as accountEmail (loginEmail is the
    // address we log into the account with), and drop the raw field name.
    const shaped = rentals.map((r) => {
      const { loginEmail, ...account } = r.linkedinAccount;
      return { ...r, linkedinAccount: { ...account, accountEmail: loginEmail } };
    });

    return NextResponse.json({ rentals: shaped });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
