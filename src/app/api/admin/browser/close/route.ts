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

      // Give it 5 seconds for graceful close and cookie flush, then force kill
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          try { child.kill("SIGKILL"); } catch { /* ignore */ }
          resolve();
        }, 5000);

        child.on("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      activeProcesses.delete(profileId);
    }

    // Only force kill if the graceful close didn't work
    // Don't use pkill as it can kill Chrome before cookies are saved

    return NextResponse.json({ message: "Browser closed and session saved" });
  } catch (error) {
    console.error("Browser close error:", error);
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to close browser" }, { status: 500 });
  }
}
