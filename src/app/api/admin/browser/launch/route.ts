import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";
import { spawnBrowser } from "@/lib/spawn-browser";
import { getNextProxy } from "@/lib/proxy-pool";
import { v4 as uuid } from "uuid";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const activeProcesses: Map<string, any> = new Map();
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

    const profileId = uuid();

    // Use provided proxy or auto-assign from pool
    const proxy = data.proxyHost
      ? {
          host: data.proxyHost,
          port: data.proxyPort || 80,
          username: data.proxyUsername || undefined,
          password: data.proxyPassword || undefined,
        }
      : getNextProxy();

    const { child, result } = await spawnBrowser({
      profileId,
      accountName: data.accountName,
      proxy,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    activeProcesses.set(profileId, child);

    return NextResponse.json({
      sessionId: profileId,
      profileId,
      proxy: { host: proxy.host, port: proxy.port },
      message: "Browser launched.",
    });
  } catch (error) {
    console.error("Browser launch error:", error);
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to launch browser" }, { status: 500 });
  }
}
