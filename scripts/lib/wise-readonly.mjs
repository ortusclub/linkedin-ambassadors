// Server/CLI only. Fixed Wise origin, GET-only API, no arbitrary request escape hatch.
const BASE = 'https://api.wise.com/2026Q3/';
export function positiveId(value, name) {
  if (!/^[1-9]\d*$/.test(String(value ?? ''))) throw new Error(`${name} must be a positive numeric ID`);
  return String(value);
}
export function createWiseReader({ token, profileId, fetchImpl = fetch }) {
  if (!token?.trim()) throw new Error('Missing WISE_API_TOKEN. See docs/wise.md.');
  const profile = profileId ? positiveId(profileId, 'WISE_PROFILE_ID') : null;
  async function get(path, params = {}) {
    const url = new URL(path, BASE);
    for (const [key, value] of Object.entries(params)) if (value != null) url.searchParams.set(key, String(value));
    let response;
    try {
      response = await fetchImpl(url, { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(20000) });
    } catch {
      throw new Error('Wise request failed or timed out. Check connectivity and retry.');
    }
    if (!response.ok) {
      const help = { 401: 'Check the token.', 403: 'Check read access for the business profile.', 404: 'Record not found.', 429: 'Rate limited; wait before retrying.' }[response.status] || 'Retry later or check Wise service status.';
      // Do not expose raw error bodies, headers, or credentials.
      throw new Error(`Wise HTTP ${response.status}. ${help}`);
    }
    try { return await response.json(); } catch { throw new Error('Wise returned invalid JSON.'); }
  }
  function requireProfile() {
    if (!profile) throw new Error('Set WISE_PROFILE_ID after running profiles. See docs/wise.md.');
    return profile;
  }
  return {
    async profiles() {
      const rows = await get('profiles');
      if (!Array.isArray(rows)) throw new Error('Unexpected Wise profile response.');
      return rows.map(p => ({ id: p.id, type: p.type, name: p.businessName ?? p.details?.name ?? p.fullName ?? null }));
    },
    async transfers({ from, to, status, limit = 100, offset = 0 } = {}) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('limit must be 1–100');
      if (!Number.isInteger(offset) || offset < 0) throw new Error('offset must be non-negative');
      for (const date of [from, to]) if (date && (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(date) || !Number.isFinite(Date.parse(date)))) throw new Error('Dates must be ISO timestamps with a timezone.');
      if (from && to && Date.parse(from) > Date.parse(to)) throw new Error('from must be before to');
      const rows = await get('transfers', { profile: requireProfile(), createdDateStart: from, createdDateEnd: to, status, limit, offset });
      if (!Array.isArray(rows)) throw new Error('Unexpected Wise transfer response.');
      for (const row of rows) if (String(row.business) !== profile) throw new Error('Wise returned a transfer outside the configured business profile.');
      return { profileId: profile, offset, limit, nextOffset: rows.length === limit ? offset + rows.length : null, transfers: rows.map(transferSummary) };
    },
    async transfer(id) {
      requireProfile();
      const row = await get(`transfers/${positiveId(id, 'transfer ID')}`);
      if (String(row.business) !== profile) throw new Error('Transfer does not belong to WISE_PROFILE_ID.');
      return transferSummary(row);
    },
    async recipient(id) {
      requireProfile();
      const row = await get(`accounts/${positiveId(id, 'recipient ID')}`);
      if (String(row.profileId ?? row.profile) !== profile) throw new Error('Recipient does not belong to WISE_PROFILE_ID.');
      return { id: row.id, name: row.name ?? row.accountHolderName, currency: row.currency, type: row.type, active: row.active };
    },
  };
}
function transferSummary(t) {
  return { id: t.id, profileId: t.business, recipientId: t.targetAccount, status: t.status, createdAt: t.created, sourceAmount: t.sourceValue, sourceCurrency: t.sourceCurrency, recipientAmount: t.targetValue, recipientCurrency: t.targetCurrency, reference: t.details?.reference ?? t.reference ?? null, hasActiveIssues: t.hasActiveIssues, wiseUrl: `https://wise.com/send#/transfer/${t.id}` };
}
