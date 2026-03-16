import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { activeProcesses } from "../launch/route";

const stopSchema = z.object({
  sessionId: z.string(),
  linkedinName: z.string().min(1),
  linkedinHeadline: z.string().optional(),
  linkedinUrl: z.string().optional(),
  connectionCount: z.number().int().min(0).default(0),
  industry: z.string().optional(),
  location: z.string().optional(),
  profileScreenshotUrl: z.string().optional(),
  profilePhotoUrl: z.string().optional(),
  proxyHost: z.string().optional(),
  proxyPort: z.number().optional(),
  proxyUsername: z.string().optional(),
  proxyPassword: z.string().optional(),
  accountAgeMonths: z.number().int().optional(),
  hasSalesNav: z.boolean().default(false),
  notes: z.string().optional(),
  status: z.enum(["available", "maintenance"]).default("available"),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = stopSchema.parse(body);

    const child = activeProcesses.get(data.sessionId);

    if (child) {
      // Send 'stop' to the child process stdin — this triggers gl.stop()
      // which uploads cookies to GoLogin cloud automatically
      await new Promise<void>((resolve) => {
        child.stdin?.write("stop\n");

        child.on("exit", () => resolve());

        // Force kill after 15 seconds if it doesn't exit
        setTimeout(() => {
          child.kill();
          resolve();
        }, 15000);
      });

      activeProcesses.delete(data.sessionId);
    }

    // Save the account to the database
    const account = await prisma.linkedInAccount.create({
      data: {
        gologinProfileId: data.sessionId,
        linkedinName: data.linkedinName,
        linkedinHeadline: data.linkedinHeadline,
        linkedinUrl: data.linkedinUrl,
        connectionCount: data.connectionCount,
        industry: data.industry,
        location: data.location,
        profileScreenshotUrl: data.profileScreenshotUrl,
        profilePhotoUrl: data.profilePhotoUrl,
        proxyHost: data.proxyHost,
        proxyPort: data.proxyPort,
        proxyUsername: data.proxyUsername,
        proxyPassword: data.proxyPassword,
        accountAgeMonths: data.accountAgeMonths,
        hasSalesNav: data.hasSalesNav,
        notes: data.notes,
        status: data.status,
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error("Browser stop error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (
      error instanceof Error &&
      (error.message === "Forbidden" || error.message === "Unauthorized")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to save account" },
      { status: 500 }
    );
  }
}
