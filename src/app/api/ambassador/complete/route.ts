import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { sendAmbassadorWelcomeEmail } from "@/services/email";

const completeSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  linkedinUrl: z.string().optional(),
  connectionCount: z.number().int().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  gologinProfileId: z.string().optional(),
  offeredAmount: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = completeSchema.parse(body);

    // Generate a random password for the ambassador account
    const tempPassword = uuid().slice(0, 12);
    const passwordHash = await hashPassword(tempPassword);

    // Create or find the user account
    let user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          fullName: data.fullName,
          role: "customer",
        },
      });
    }

    // Create the LinkedIn account in the admin system
    const linkedinAccount = await prisma.linkedInAccount.create({
      data: {
        gologinProfileId: data.gologinProfileId || null,
        linkedinName: `${data.fullName} (${data.email})`,
        linkedinHeadline: null,
        linkedinUrl: data.linkedinUrl || null,
        connectionCount: data.connectionCount || 0,
        industry: data.industry || null,
        location: data.location || null,
        monthlyPrice: data.offeredAmount || 50,
        status: "available",
        notes: `Ambassador account. Owner: ${data.email}. Monthly payout: $${data.offeredAmount || 0}`,
      },
    });

    // Log the ambassador in
    await createSession(user.id);

    // Send welcome email with credentials
    await sendAmbassadorWelcomeEmail(
      data.email,
      data.fullName,
      tempPassword,
      data.offeredAmount || 0
    );

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        tempPassword,
      },
      linkedinAccount: {
        id: linkedinAccount.id,
        linkedinName: linkedinAccount.linkedinName,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Ambassador complete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
