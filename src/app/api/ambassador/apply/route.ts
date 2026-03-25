import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { assessFromApplication } from "@/services/profile-assessor";

const applySchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  linkedinEmail: z.string().email().optional(),
  contactNumber: z.string().optional(),
  linkedinUrl: z.string().min(1),
  connectionCount: z.number().int().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = applySchema.parse(body);

    // Check for duplicate application (same email AND same LinkedIn URL)
    const existing = await prisma.ambassadorApplication.findFirst({
      where: { email: data.email, linkedinUrl: data.linkedinUrl, status: { in: ["pending", "reviewing", "approved"] } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already have an active application for this account" },
        { status: 409 }
      );
    }

    // Auto-assess the profile
    const assessment = assessFromApplication({
      connectionCount: data.connectionCount,
      industry: data.industry,
      location: data.location,
      notes: data.notes,
    });

    // Create application with auto-assessment results
    const application = await prisma.ambassadorApplication.create({
      data: {
        ...data,
        status: assessment.autoApproved ? "approved" : "reviewing",
        offeredAmount: assessment.offeredAmount,
        adminNotes: `Auto-assessed: Score ${assessment.score}/100, Tier: ${assessment.tier}. ${assessment.breakdown.map((b) => `${b.category}: ${b.points}/${b.maxPoints}`).join(", ")}`,
      },
    });

    // If auto-approved, create a LinkedInAccount automatically
    if (assessment.autoApproved) {
      const existingAccount = await prisma.linkedInAccount.findFirst({
        where: { linkedinUrl: data.linkedinUrl },
      });
      if (!existingAccount) {
        await prisma.linkedInAccount.create({
          data: {
            linkedinName: data.fullName,
            linkedinUrl: data.linkedinUrl,
            connectionCount: data.connectionCount || 0,
            industry: data.industry || null,
            location: data.location || null,
            status: "under_review",
            ambassadorPayment: assessment.offeredAmount,
            notes: `Owner: ${data.email}. Profile email: ${data.linkedinEmail || data.email}.`,
          },
        });
      }
    }

    return NextResponse.json({
      application,
      assessment: {
        score: assessment.score,
        tier: assessment.tier,
        offeredAmount: assessment.offeredAmount,
        breakdown: assessment.breakdown,
        autoApproved: assessment.autoApproved,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Ambassador apply error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
