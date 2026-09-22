import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { isShadowRenterEmail } from "@/lib/shadow-rental";

export async function GET() {
  try {
    const user = await requireAuth();
    const data = await prisma.user.findUnique({
      where: { id: user.id },
      select: { usdcBalance: true, isShadowRenter: true, email: true },
    });

    return NextResponse.json({
      balance: data?.usdcBalance?.toString() || "0",
      // Shadow renters (Apex Strategy) are billed a flat rate regardless of account price.
      isShadowRenter: data?.isShadowRenter === true || isShadowRenterEmail(data?.email),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
