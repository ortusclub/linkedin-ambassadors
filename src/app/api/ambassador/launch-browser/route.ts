import { NextResponse } from "next/server";
import { z } from "zod";
import { spawnBrowser } from "@/lib/spawn-browser";
import { activeProcesses } from "@/app/api/admin/browser/launch/route";

const launchSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  linkedinUrl: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = launchSchema.parse(body);

    const token = process.env.GOLOGIN_API_TOKEN!;

    // Create a GoLogin profile for this ambassador
    const createRes = await fetch("https://api.gologin.com/browser", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `AMB - ${data.fullName}`,
        os: "mac",
        browserType: "chrome",
        navigator: {
          language: "en-US,en",
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          resolution: "1920x1080",
          platform: "MacIntel",
        },
        proxy: { mode: "none" },
        fonts: {
          enableMasking: true,
          enableDomRect: true,
          families: ["Arial","Verdana","Helvetica","Times New Roman","Courier New","Georgia","Trebuchet MS","Arial Black","Impact","Comic Sans MS","Tahoma","Lucida Grande","Monaco","Menlo","Palatino","Futura","Gill Sans","Helvetica Neue","Optima","Baskerville"],
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return NextResponse.json({ error: `Failed to create browser profile: ${errText}` }, { status: 500 });
    }

    const profile = await createRes.json();
    const profileId = profile.id;

    // Launch the browser
    const { child, result } = await spawnBrowser({
      token,
      profileId,
      accountName: data.fullName,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    activeProcesses.set(profileId, child);

    return NextResponse.json({
      profileId,
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
