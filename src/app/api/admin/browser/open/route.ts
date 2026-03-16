import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { spawn } from "child_process";
import path from "path";
import { activeProcesses } from "../launch/route";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { profileId, accountName } = await req.json();

    if (!profileId) {
      return NextResponse.json({ error: "No profileId provided" }, { status: 400 });
    }

    // Check if already running — but verify the process is still alive
    const existingProcess = activeProcesses.get(profileId);
    if (existingProcess) {
      if (existingProcess.killed || existingProcess.exitCode !== null) {
        // Process is dead, clean it up
        activeProcesses.delete(profileId);
      } else {
        // Process is still alive, bring window to front
        try {
          const { execSync } = await import("child_process");
          execSync(`osascript -e 'tell application "System Events" to set frontmost of (first process whose name contains "Orbita") to true'`, { timeout: 3000 });
        } catch { /* ignore */ }
        return NextResponse.json({ message: "Browser is already open", sessionId: profileId });
      }
    }

    const token = process.env.GOLOGIN_API_TOKEN!;
    const scriptPath = path.join(process.cwd(), "src/lib/browser-launcher.mjs");

    const result = await new Promise<{ status: string; error?: string }>((resolve, reject) => {
      const child = spawn(
        "node",
        [scriptPath, "launch", JSON.stringify({ token, profileId, accountName })],
        { stdio: ["pipe", "pipe", "pipe"] }
      );

      let resolved = false;

      child.stdout.on("data", (chunk) => {
        if (!resolved) {
          try {
            const msg = JSON.parse(chunk.toString().trim());
            resolved = true;
            activeProcesses.set(profileId, child);
            resolve(msg);
          } catch {
            // not JSON yet
          }
        }
      });

      child.stderr.on("data", (chunk) => {
        console.error("Browser open stderr:", chunk.toString());
      });

      child.on("error", (err) => {
        if (!resolved) { resolved = true; reject(err); }
      });

      child.on("exit", (code) => {
        if (!resolved) { resolved = true; reject(new Error(`Exited with code ${code}`)); }
      });

      setTimeout(() => {
        if (!resolved) { resolved = true; child.kill(); reject(new Error("Timed out")); }
      }, 60000);
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ message: "Browser opened", sessionId: profileId });
  } catch (error) {
    console.error("Browser open error:", error);
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to open browser" },
      { status: 500 }
    );
  }
}
