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

      // Wait 3 seconds for graceful close
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          try { child.kill("SIGKILL"); } catch { /* ignore */ }
          resolve();
        }, 3000);

        child.on("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      activeProcesses.delete(profileId);
    }

    // Wait a moment for cookies to flush, then kill any remaining Chrome for this profile
    await new Promise((r) => setTimeout(r, 1000));
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
