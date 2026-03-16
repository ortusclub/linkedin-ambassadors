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
      await new Promise<void>((resolve) => {
        child.stdin?.write("stop\n");
        child.on("exit", () => resolve());
        setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 10000);
      });
      activeProcesses.delete(profileId);
    }

    try {
      execCommand(`pkill -f "gologin_profile_${profileId}" 2>/dev/null || true`);
      execCommand(`pkill -f "orbita" 2>/dev/null || true`);
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
