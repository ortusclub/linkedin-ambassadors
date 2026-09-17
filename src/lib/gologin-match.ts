// Match a GoLogin profile to one of our accounts by profile NAME (= the account's
// login email). Most of our accounts already have a GoLogin profile named with the
// login email but no gologinProfileId stored in the DB — this links them without
// creating a duplicate. Paginates GET /browser/v2 (30/page). Token defaults to the
// master GOLOGIN_API_TOKEN, which covers klabber profiles too (verified).

const GOLOGIN_API_BASE = "https://api.gologin.com";

export async function findProfileByName(
  loginEmail: string,
  token?: string
): Promise<{ id: string; name: string } | null> {
  const target = loginEmail.trim().toLowerCase();
  if (!target) return null;
  const auth = `Bearer ${token || process.env.GOLOGIN_API_TOKEN}`;
  for (let page = 1; page < 50; page++) {
    const res = await fetch(`${GOLOGIN_API_BASE}/browser/v2?page=${page}`, {
      headers: { Authorization: auth, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`GoLogin list error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const batch: { id: string; name?: string }[] = json?.profiles || [];
    if (batch.length === 0) break;
    const hit = batch.find((p) => (p.name || "").trim().toLowerCase() === target);
    if (hit) return { id: hit.id, name: hit.name || "" };
    if (batch.length < 30) break; // last page
  }
  return null;
}
