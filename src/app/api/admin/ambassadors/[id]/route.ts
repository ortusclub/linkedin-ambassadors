import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["pending", "reviewing", "approved", "rejected", "onboarded"]).optional(),
  offeredAmount: z.number().optional(),
  adminNotes: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    // Get the current application before updating
    const currentApp = await prisma.ambassadorApplication.findUnique({ where: { id } });
    if (!currentApp) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const application = await prisma.ambassadorApplication.update({
      where: { id },
      data,
    });

    // When status changes to "approved", automatically create a LinkedInAccount
    if (data.status === "approved" && currentApp.status !== "approved") {
      // Check if a LinkedInAccount already exists for this LinkedIn URL
      const existingAccount = await prisma.linkedInAccount.findFirst({
        where: { linkedinUrl: application.linkedinUrl },
      });

      if (!existingAccount) {
        await prisma.linkedInAccount.create({
          data: {
            linkedinName: application.fullName,
            linkedinUrl: application.linkedinUrl,
            connectionCount: application.connectionCount || 0,
            industry: application.industry || null,
            location: application.location || null,
            status: "under_review",
            ambassadorPayment: application.offeredAmount || 0,
            notes: `Owner: ${application.email}. Profile email: ${application.linkedinEmail || application.email}.`,
          },
        });
      }
    }

    return NextResponse.json({ application });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
