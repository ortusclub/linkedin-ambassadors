import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";
import { spawnBrowser } from "@/lib/spawn-browser";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const activeProcesses: Map<string, any> = new Map();
export { activeProcesses };

const launchSchema = z.object({
  accountName: z.string().min(1),
  proxyHost: z.string().optional(),
  proxyPort: z.number().optional(),
  proxyUsername: z.string().optional(),
  proxyPassword: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = launchSchema.parse(body);

    const token = process.env.GOLOGIN_API_TOKEN!;

    const createRes = await fetch("https://api.gologin.com/browser", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `LA - ${data.accountName}`,
        os: "mac",
        browserType: "chrome",
        navigator: {
          language: "en-US,en",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          resolution: "1920x1080",
          platform: "MacIntel",
        },
        proxy: data.proxyHost
          ? { mode: "http", host: data.proxyHost, port: data.proxyPort || 80, username: data.proxyUsername || "", password: data.proxyPassword || "" }
          : { mode: "none" },
        fonts: {
          enableMasking: true,
          enableDomRect: true,
          families: ["Arial","Verdana","Helvetica","Times New Roman","Courier New","Georgia","Trebuchet MS","Arial Black","Impact","Comic Sans MS","Tahoma","Lucida Grande","Monaco","Menlo","Palatino","Futura","Gill Sans","Helvetica Neue","Optima","Baskerville"],
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return NextResponse.json({ error: `Failed to create GoLogin profile: ${errText}` }, { status: 500 });
    }

    const profile = await createRes.json();
    const profileId = profile.id;

    const { child, result } = await spawnBrowser({ token, profileId });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    activeProcesses.set(profileId, child);

    return NextResponse.json({ sessionId: profileId, profileId, message: "Browser launched." });
  } catch (error) {
    console.error("Browser launch error:", error);
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to launch browser" }, { status: 500 });
  }
}
