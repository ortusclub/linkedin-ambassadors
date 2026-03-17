import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { activeProcesses } from "../launch/route";

export async function GET() {
  try {
    await requireAdmin();

    const active: string[] = [];
    for (const [profileId, child] of activeProcesses.entries()) {
      // Check if process is truly still running
      let alive = false;
      try {
        // process.kill(pid, 0) checks if process exists without killing it
        if (child.pid && !child.killed && child.exitCode === null) {
          process.kill(child.pid, 0);
          alive = true;
        }
      } catch {
        // Process doesn't exist
      }

      if (alive) {
        active.push(profileId);
      } else {
        activeProcesses.delete(profileId);
      }
    }

    return NextResponse.json({ active });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
