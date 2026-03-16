const GOLOGIN_API_BASE = "https://api.gologin.com";

function headers() {
  return {
    Authorization: `Bearer ${process.env.GOLOGIN_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function gologinFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${GOLOGIN_API_BASE}${path}`, {
    ...options,
    headers: { ...headers(), ...options.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GoLogin API error ${res.status}: ${body}`);
  }
  return res.json();
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

export async function shareProfile(profileId: string, email: string) {
  return gologinFetch(`/browser/${profileId}/share`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function unshareProfile(profileId: string, email: string) {
  return gologinFetch(`/browser/${profileId}/share`, {
    method: "DELETE",
    body: JSON.stringify({ email }),
  });
}

export async function getProfile(profileId: string) {
  return gologinFetch(`/browser/${profileId}`);
}
