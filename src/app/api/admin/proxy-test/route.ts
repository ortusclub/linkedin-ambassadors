import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";
import { testProxy } from "@/lib/proxy-verify";

const proxySchema = z.object({
  host: z.string().min(1),
  port: z.string().or(z.number()),
  username: z.string().optional(),
  password: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = proxySchema.parse(body);

    const probe = testProxy(data);
    if (probe.ok && probe.ip) {
      return NextResponse.json({ success: true, ip: probe.ip, method: probe.method, message: `Proxy working (${probe.method}). External IP: ${probe.ip}` });
    }
    if (probe.ok) {
      return NextResponse.json({ success: true, message: `Port is open on ${data.host}. Proxy is reachable but may only work within GoLogin browser profiles.` });
    }
    return NextResponse.json({ success: false, message: "Could not connect through proxy. Check host, port, and credentials." });
  } catch (error) {
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to test proxy" }, { status: 500 });
  }
}
