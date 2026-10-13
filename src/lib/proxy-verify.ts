import { execCommand } from "@/lib/spawn-browser";

// Reachability + egress-IP/geo check for a raw proxy, usable server-side before we commit a
// swap. NOTE: this proves the proxy is alive and where it claims to be — it does NOT prove
// LinkedIn loads cleanly inside a GoLogin profile (no code anywhere does). That real-world
// check is the renter's "working / still broken" confirmation. See the fix-account-proxy flow.
export type ProxyProbe = {
  ok: boolean;
  ip?: string;
  country?: string | null; // ISO2 when the plain-HTTP ip-api lookup succeeds
  method?: string;
};

export function testProxy(p: {
  host: string;
  port: number | string;
  username?: string | null;
  password?: string | null;
}): ProxyProbe {
  const port = typeof p.port === "string" ? parseInt(p.port, 10) : p.port;
  const auth = p.username && p.password ? `${p.username}:${p.password}@` : "";
  const proxyUrl = `http://${auth}${p.host}:${port}`;

  // ip-api first (returns country), then ipify over HTTPS, then SOCKS5.
  const methods = [
    { name: "HTTP", cmd: `curl -s --max-time 8 --proxy "${proxyUrl}" "http://ip-api.com/json"` },
    { name: "HTTPS", cmd: `curl -s --max-time 8 --proxy "${proxyUrl}" "https://api.ipify.org?format=json"` },
    { name: "SOCKS5", cmd: `curl -s --max-time 8 --proxy "socks5://${auth}${p.host}:${port}" "https://api.ipify.org?format=json"` },
  ];

  for (const m of methods) {
    try {
      const out = execCommand(m.cmd).trim();
      if (out.startsWith("{")) {
        const d = JSON.parse(out) as { ip?: string; query?: string; countryCode?: string };
        const ip = d.ip || d.query || undefined;
        if (ip) return { ok: true, ip, country: d.countryCode ?? null, method: m.name };
      }
    } catch {
      /* try next */
    }
  }

  // Last resort: is the port even open? Reachable but may only work inside GoLogin.
  try {
    execCommand(`nc -z -w 5 ${p.host} ${port}`);
    return { ok: true, method: "port" };
  } catch {
    return { ok: false };
  }
}
