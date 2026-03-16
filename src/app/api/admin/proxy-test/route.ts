import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";
import { execSync } from "child_process";

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

    const port = typeof data.port === "string" ? parseInt(data.port) : data.port;
    const auth =
      data.username && data.password
        ? `${data.username}:${data.password}@`
        : "";
    const proxyUrl = `http://${auth}${data.host}:${port}`;

    // Try multiple approaches
    const methods = [
      { name: "HTTP", cmd: `curl -s --max-time 8 --proxy "${proxyUrl}" "https://api.ipify.org?format=json"` },
      { name: "SOCKS5", cmd: `curl -s --max-time 8 --proxy "socks5://${auth}${data.host}:${port}" "https://api.ipify.org?format=json"` },
      { name: "HTTP (plain)", cmd: `curl -s --max-time 8 --proxy "${proxyUrl}" "http://ip-api.com/json"` },
    ];

    for (const method of methods) {
      try {
        const result = execSync(method.cmd, { encoding: "utf-8", timeout: 12000 });
        const trimmed = result.trim();
        if (trimmed.startsWith("{")) {
          const ipData = JSON.parse(trimmed);
          const ip = ipData.ip || ipData.query || "unknown";
          return NextResponse.json({
            success: true,
            ip,
            method: method.name,
            message: `Proxy working (${method.name}). External IP: ${ip}`,
          });
        }
      } catch {
        // Try next method
      }
    }

    // If all curl methods fail, try a basic TCP connection test
    try {
      execSync(
        `nc -z -w 5 ${data.host} ${port}`,
        { encoding: "utf-8", timeout: 8000 }
      );
      return NextResponse.json({
        success: true,
        message: `Port ${port} is open on ${data.host}. Proxy is reachable but may only work within GoLogin browser profiles.`,
      });
    } catch {
      // Port not reachable
    }

    return NextResponse.json({
      success: false,
      message: "Could not connect through proxy. Check host, port, and credentials.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Forbidden" || error.message === "Unauthorized")
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to test proxy" },
      { status: 500 }
    );
  }
}
