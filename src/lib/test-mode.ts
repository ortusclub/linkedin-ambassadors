// Heuristic to auto-flag obvious test signups so they don't pollute live dashboard
// metrics. Catches gmail "+alias" addresses, anything with "test" in it, and our own
// internal @ortus.solutions addresses. Admins can always toggle this on the Renters tab.
export function isLikelyTestEmail(email: string): boolean {
  const e = (email || "").toLowerCase();
  return e.includes("+") || /test/.test(e) || e.endsWith("@ortus.solutions");
}
