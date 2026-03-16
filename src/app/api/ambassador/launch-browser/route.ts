import { NextResponse } from "next/server";
import { z } from "zod";
import { spawnBrowser } from "@/lib/spawn-browser";
import { activeProcesses } from "@/app/api/admin/browser/launch/route";
import { getNextProxy } from "@/lib/proxy-pool";

const launchSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  linkedinUrl: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = launchSchema.parse(body);

    // Generate a profile ID from the email
    const profileId = data.email.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

    // Auto-assign proxy from pool
    const proxy = getNextProxy();

    // Launch the browser with our custom Chromium system
    const { child, result } = await spawnBrowser({
      profileId,
      accountName: data.fullName,
      proxy,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    activeProcesses.set(profileId, child);

    return NextResponse.json({
      profileId,
      proxy: { host: proxy.host, port: proxy.port },
      message: "Browser launched. Please log into LinkedIn.",
    });
  } catch (error) {
    console.error("Ambassador browser launch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to launch browser" },
      { status: 500 }
    );
  }
}
