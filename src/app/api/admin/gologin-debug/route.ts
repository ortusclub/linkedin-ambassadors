import { NextResponse } from "next/server";

// Diagnostic-only. Protected by CRON_SECRET (?secret=...). Read-only against GoLogin:
// tells us, for each profile id, which token can see it and which workspace it lives in.
// Use to debug share "ghosts" (klabber profiles shared against the wrong workspace).
const API = "https://api.gologin.com";

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
  out.klabberShareUsage = {
    a: await gj("/share/multi?currentWorkspace=69c1f7df88b94e048876f1d8", klabber),
    b: await gj("/users/shares", klabber),
    c: await gj("/workspaces/69c1f7df88b94e048876f1d8", klabber),
  };

  const profiles: Record<string, unknown> = {};
  for (const id of ids) {
    profiles[id] = {
      viaMaster: slimProfile(await gj(`/browser/${id}`, master)),
      viaKlabber: slimProfile(await gj(`/browser/${id}`, klabber)),
    };
  }
  out.profiles = profiles;
  return NextResponse.json(out);
}
