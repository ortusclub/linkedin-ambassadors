import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { activeProcesses } from "../launch/route";
import { spawnBrowser, execCommand } from "@/lib/spawn-browser";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { profileId, accountName } = await req.json();

    if (!profileId) {
      return NextResponse.json({ error: "No profileId provided" }, { status: 400 });
    }

    const existingProcess = activeProcesses.get(profileId);
    if (existingProcess) {
      if (existingProcess.killed || existingProcess.exitCode !== null) {
        activeProcesses.delete(profileId);
      } else {
        try {
          execCommand(`osascript -e 'tell application "System Events" to set frontmost of (first process whose name contains "Orbita") to true'`);
        } catch { /* ignore */ }
        return NextResponse.json({ message: "Browser is already open", sessionId: profileId });
      }
    }

    const token = process.env.GOLOGIN_API_TOKEN!;
    const { child, result } = await spawnBrowser({ token, profileId, accountName });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    activeProcesses.set(profileId, child);

    return NextResponse.json({ message: "Browser opened", sessionId: profileId });
  } catch (error) {
    console.error("Browser open error:", error);
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to open browser" }, { status: 500 });
  }
}
