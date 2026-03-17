import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { activeProcesses } from "../launch/route";
import { execCommand } from "@/lib/spawn-browser";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { profileId } = await req.json();

    if (!profileId) {
      return NextResponse.json({ error: "No profileId provided" }, { status: 400 });
    }

    const child = activeProcesses.get(profileId);
    if (child) {
      // Try graceful stop first
      try { child.stdin?.write("stop\n"); } catch { /* ignore */ }

      // Give it 2 seconds, then force kill
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          try { child.kill("SIGKILL"); } catch { /* ignore */ }
          resolve();
        }, 2000);

        child.on("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      activeProcesses.delete(profileId);
    }

    // Kill any Chrome/Chromium processes spawned for this profile
    try {
      execCommand(`pkill -f "chrome-data" 2>/dev/null || true`);
    } catch { /* ignore */ }

    // Also kill by user data dir pattern
    try {
      execCommand(`pkill -f "${profileId}" 2>/dev/null || true`);
    } catch { /* ignore */ }

    return NextResponse.json({ message: "Browser closed and session saved" });
  } catch (error) {
    console.error("Browser close error:", error);
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to close browser" }, { status: 500 });
  }
}
