import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activeProcesses } from "../launch/route";
import { spawnBrowser, execCommand } from "@/lib/spawn-browser";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { profileId, accountName, accountId } = await req.json();

    const id = profileId || accountId;
    if (!id) {
      return NextResponse.json({ error: "No profileId or accountId provided" }, { status: 400 });
    }

    const existingProcess = activeProcesses.get(id);
    if (existingProcess) {
      if (existingProcess.killed || existingProcess.exitCode !== null) {
        activeProcesses.delete(id);
      } else {
        try {
          execCommand(`osascript -e 'tell application "Google Chrome" to activate' 2>/dev/null`);
        } catch { /* ignore */ }
        return NextResponse.json({ message: "Browser is already open", sessionId: id });
      }
    }

    // Look up proxy info from the database if we have an account
    let proxy = undefined;
    if (accountId) {
      const account = await prisma.linkedInAccount.findUnique({ where: { id: accountId } });
      if (account?.proxyHost) {
        proxy = {
          host: account.proxyHost,
          port: account.proxyPort || 80,
          username: account.proxyUsername || undefined,
          password: account.proxyPassword || undefined,
        };
      }
    }

    const { child, result } = await spawnBrowser({
      profileId: id,
      accountName,
      proxy,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    activeProcesses.set(id, child);

    return NextResponse.json({ message: "Browser opened", sessionId: id });
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
