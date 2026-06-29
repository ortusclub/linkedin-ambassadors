import { NextResponse } from "next/server";

// Diagnostic-only. Protected by CRON_SECRET (?secret=...). Read-only against GoLogin:
// tells us, for each profile id, which token can see it and which workspace it lives in.
// Use to debug share "ghosts" (klabber profiles shared against the wrong workspace).
const API = "https://api.gologin.com";

// Keys present on a plain /browser/{id} (so we can spot what ?withShares=true adds).
const BASE_PROFILE_KEYS = [
  "name", "id", "notes", "browserType", "canBeRunning", "os", "osSpec", "startUrl",
  "autoLang", "bookmarks", "googleServicesEnabled", "isBookmarksSynced", "launchArguments",
  "lockEnabled", "debugMode", "navigator", "storage", "proxyEnabled", "autoProxyServer",
  "autoProxyUsername", "autoProxyPassword", "proxy", "dns", "plugins", "timezone",
  "geolocation", "audioContext", "canvas", "fonts", "mediaDevices", "webRTC", "webGL",
  "webGpu", "clientRects", "webGLMetadata", "webglParams", "extensions", "s3Path", "s3Date",
  "devicePixelRatio", "owner", "checkCookies", "chromeExtensions", "userChromeExtensions",
  "permissions",
];

async function gj(path: string, token?: string) {
  if (!token) return { status: 0, note: "no token in env" };
  const r = await fetch(API + path, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const t = await r.text();
  let body: unknown = t;
  try { body = t ? JSON.parse(t) : null; } catch { /* keep raw */ }
  return { status: r.status, body };
}

function slimWorkspaces(res: { status: number; body?: unknown }) {
  const b = res.body as { workspaces?: unknown } | unknown[] | undefined;
  const arr = Array.isArray(b) ? b : (b as { workspaces?: unknown[] })?.workspaces;
  if (!Array.isArray(arr)) return res;
  return {
    status: res.status,
    workspaces: arr.map((w) => {
      const x = w as { _id?: string; id?: string; name?: string };
      return { id: x._id || x.id, name: x.name };
    }),
  };
}

function slimProfile(res: { status: number; body?: unknown }) {
  if (res.status !== 200) return res;
  const p = res.body as Record<string, unknown>;
  return {
    status: 200,
    name: p?.name,
    keys: Object.keys(p || {}),
    workspaceId: p?.workspaceId ?? p?.workspace ?? null,
    role: p?.role ?? null,
    sharedTo: p?.sharedEmails ?? p?.shares ?? p?.sharedTo ?? p?.permissions ?? null,
  };
}

// POST: run a raw share/unshare with a CHOSEN workspace + account token, to A/B test
// whether the workspace id is what makes klabber shares "real" vs "ghost".
// Body: { secret, action:"share"|"unshare", profileId, email, workspace, account, shareId }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body.secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = body.account === "klabber"
    ? process.env.GOLOGIN_API_TOKEN_KLABBER
    : process.env.GOLOGIN_API_TOKEN;
  const ws = body.workspace || "68654b73cd7edf1e3ed6d13f";

  if (body.action === "share") {
    const r = await fetch(`${API}/share/multi?currentWorkspace=${ws}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "browser",
        instanceIds: [body.profileId],
        role: "guest",
        recepients: [body.email],
      }),
    });
    const t = await r.text();
    let parsed: unknown = t; try { parsed = t ? JSON.parse(t) : null; } catch { /* raw */ }
    return NextResponse.json({ status: r.status, workspaceUsed: ws, account: body.account, result: parsed });
  }
  if (body.action === "unshare") {
    const r = await fetch(`${API}/share/${body.shareId}?currentWorkspace=${ws}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const t = await r.text();
    let parsed: unknown = t; try { parsed = t ? JSON.parse(t) : null; } catch { /* raw */ }
    return NextResponse.json({ status: r.status, workspaceUsed: ws, result: parsed });
  }
  return NextResponse.json({ error: "action must be share|unshare" }, { status: 400 });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ids = (url.searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const master = process.env.GOLOGIN_API_TOKEN;
  const klabber = process.env.GOLOGIN_API_TOKEN_KLABBER;

  const out: Record<string, unknown> = {
    tokensPresent: { master: !!master, klabber: !!klabber },
    hardcodedMasterWorkspace: "68654b73cd7edf1e3ed6d13f",
    envWorkspaceId: process.env.GOLOGIN_WORKSPACE_ID || null,
    workspaces: {
      master: slimWorkspaces(await gj("/workspaces", master)),
      klabber: slimWorkspaces(await gj("/workspaces", klabber)),
    },
  };

  // Plan + share-quota details (the real constraint).
  out.klabberUser = await gj("/user", klabber);
  out.workspace = await gj("/workspaces/69c1f7df88b94e048876f1d8", klabber);

  // Hunt for the endpoint that LISTS profile shares so we can revoke orphans.
  if (url.searchParams.get("probe") === "1") {
    const WS = "69c1f7df88b94e048876f1d8";
    const pid = ids[0];
    const candidates = [
      `/share-emails/${pid}`,
      `/browser/${pid}/share-emails`,
      `/shareEmails?currentWorkspace=${WS}`,
      `/share-emails?profileId=${pid}`,
      `/share/list?currentWorkspace=${WS}`,
      `/v1/share?currentWorkspace=${WS}`,
      `/browser/${pid}?withShares=true`,
      `/folders?currentWorkspace=${WS}`,
      `/guests?currentWorkspace=${WS}`,
      `/workspaces/${WS}/invites`,
      `/invites?currentWorkspace=${WS}`,
      `/browser/${pid}/sharings`,
      `/sharings?currentWorkspace=${WS}`,
      `/browser/share/${pid}`,
      `/share/browser/${pid}`,
    ];
    const probe: Record<string, unknown> = {};
    for (const path of candidates) {
      const r = await gj(path, klabber);
      const bodyType = Array.isArray(r.body) ? `array[${r.body.length}]` : typeof r.body;
      probe[path] = { status: r.status, bodyType };
    }
    out.probe = probe;
  }

  const profiles: Record<string, unknown> = {};
  for (const id of ids) {
    const ws = await gj(`/browser/${id}?withShares=true`, klabber);
    const b = (ws.status === 200 ? ws.body : {}) as Record<string, unknown>;
    // find array fields that look like share records (contain emails)
    const shareFields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(b || {})) {
      if (Array.isArray(v) && v.length && typeof v[0] === "object" &&
          JSON.stringify(v).includes("@")) {
        shareFields[k] = v;
      }
      if (/share|guest|invite|email/i.test(k) && v != null && !Array.isArray(v)) {
        shareFields[k] = v;
      }
    }
    profiles[id] = {
      name: b?.name,
      newKeys: Object.keys(b || {}).filter((k) => !BASE_PROFILE_KEYS.includes(k)),
      shareFields,
    };
  }
  out.profiles = profiles;
  return NextResponse.json(out);
}
