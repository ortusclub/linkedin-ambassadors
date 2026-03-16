import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";
import { spawn, type ChildProcess } from "child_process";
import path from "path";

// Store active browser processes in memory
const activeProcesses: Map<string, ChildProcess> = new Map();
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

    // Step 1: Create GoLogin profile via REST API
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
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          resolution: "1920x1080",
          platform: "MacIntel",
        },
        proxy: data.proxyHost
          ? {
              mode: "http",
              host: data.proxyHost,
              port: data.proxyPort || 80,
              username: data.proxyUsername || "",
              password: data.proxyPassword || "",
            }
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
      console.error("GoLogin create profile error:", errText);
      return NextResponse.json(
        { error: `Failed to create GoLogin profile: ${errText}` },
        { status: 500 }
      );
    }

    const profile = await createRes.json();
    const profileId = profile.id;

    // Step 2: Launch browser via child process (avoids Turbopack bundling issues)
    const scriptPath = path.join(process.cwd(), "src/lib/browser-launcher.mjs");

    const result = await new Promise<{ status: string; profileId: string; error?: string }>(
      (resolve, reject) => {
        const child = spawn(
          "node",
          [scriptPath, "launch", JSON.stringify({ token, profileId })],
          { stdio: ["pipe", "pipe", "pipe"] }
        );

        let resolved = false;

        child.stdout.on("data", (chunk) => {
          if (!resolved) {
            try {
              const msg = JSON.parse(chunk.toString().trim());
              resolved = true;
              // Store the process so we can stop it later
              activeProcesses.set(profileId, child);
              resolve(msg);
            } catch {
              // not JSON yet, ignore
            }
          }
        });

        child.stderr.on("data", (chunk) => {
          console.error("Browser launcher stderr:", chunk.toString());
        });

        child.on("error", (err) => {
          if (!resolved) {
            resolved = true;
            reject(err);
          }
        });

        child.on("exit", (code) => {
          if (!resolved) {
            resolved = true;
            reject(new Error(`Browser launcher exited with code ${code}`));
          }
        });

        // Timeout after 60 seconds
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            child.kill();
            reject(new Error("Browser launch timed out"));
          }
        }, 60000);
      }
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      sessionId: profileId,
      profileId,
      message:
        "Browser launched. Log into LinkedIn, then come back and click Save.",
    });
  } catch (error) {
    console.error("Browser launch error:", error);
    if (
      error instanceof Error &&
      (error.message === "Forbidden" || error.message === "Unauthorized")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to launch browser",
      },
      { status: 500 }
    );
  }
}
