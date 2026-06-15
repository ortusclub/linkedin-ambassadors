const GOLOGIN_API_BASE = "https://api.gologin.com";
// Workspace that owns the rental profiles. The share API needs this in the query
// string — without it (and with the wrong body `type`) shares become non-functional "ghosts".
const GOLOGIN_WORKSPACE_ID = process.env.GOLOGIN_WORKSPACE_ID || "68654b73cd7edf1e3ed6d13f";

function headers(token?: string) {
  return {
    Authorization: `Bearer ${token || process.env.GOLOGIN_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function gologinFetch(path: string, options: RequestInit = {}, token?: string) {
  const res = await fetch(`${GOLOGIN_API_BASE}${path}`, {
    ...options,
    headers: { ...headers(token), ...options.headers },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GoLogin API error ${res.status}: ${text}`);
  }
  // DELETE/revoke (and some calls) return an empty body — don't choke parsing it.
  return text ? JSON.parse(text) : null;
}

export async function createProfile(options: {
  name: string;
  proxy?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
}) {
  return gologinFetch("/browser", {
    method: "POST",
    body: JSON.stringify({
      name: options.name,
      os: "mac",
      browserType: "chrome",
      navigator: {
        language: "en-US,en",
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        resolution: "1920x1080",
        platform: "MacIntel",
      },
      proxy: options.proxy
        ? {
            mode: "http",
            host: options.proxy.host,
            port: options.proxy.port,
            username: options.proxy.username,
            password: options.proxy.password,
          }
        : undefined,
    }),
  });
}

export async function deleteProfile(profileId: string) {
  return gologinFetch(`/browser/${profileId}`, { method: "DELETE" });
}

export async function updateProxy(
  profileId: string,
  proxy: { host: string; port: number; username?: string; password?: string }
) {
  return gologinFetch(`/browser/${profileId}/proxy`, {
    method: "PATCH",
    body: JSON.stringify({
      mode: "http",
      host: proxy.host,
      port: proxy.port,
      username: proxy.username,
      password: proxy.password,
    }),
  });
}

export async function addCookies(profileId: string, cookies: object[]) {
  return gologinFetch(`/browser/${profileId}/cookies`, {
    method: "POST",
    body: JSON.stringify(cookies),
  });
}

// Grant a renter access to a profile (role "guest" = can run/view, not edit).
export async function shareProfile(profileId: string, email: string, token?: string) {
  return gologinFetch(`/share/multi?currentWorkspace=${GOLOGIN_WORKSPACE_ID}`, {
    method: "POST",
    body: JSON.stringify({
      type: "browser", // GoLogin uses "browser" here, not "profile"
      instanceIds: [profileId],
      role: "guest",
      recepients: [email], // GoLogin's API spells it "recepients"
    }),
  }, token);
}

// Revoke a renter's access by the SHARE id (returned when the share was created
// via shareProfile). GoLogin exposes an (undocumented) DELETE /share/{shareId}.
export async function unshareProfile(shareId: string, token?: string) {
  return gologinFetch(`/share/${shareId}?currentWorkspace=${GOLOGIN_WORKSPACE_ID}`, { method: "DELETE" }, token);
}

export async function getProfile(profileId: string) {
  return gologinFetch(`/browser/${profileId}`);
}
