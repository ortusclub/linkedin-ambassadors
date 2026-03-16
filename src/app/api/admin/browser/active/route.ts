import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { activeProcesses } from "../launch/route";

export async function GET() {
  try {
    await requireAdmin();

    // Return list of profile IDs with active browser sessions
    const active: string[] = [];
    for (const [profileId, child] of activeProcesses.entries()) {
      if (child.killed || child.exitCode !== null) {
        activeProcesses.delete(profileId);
      } else {
        active.push(profileId);
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
