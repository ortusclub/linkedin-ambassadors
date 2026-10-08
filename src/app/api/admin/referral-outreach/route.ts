import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { OutreachRow, OutreachSegment } from "@/lib/referral-outreach";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://linkedvelocity.com";
const SIGNUP_URL = `${APP_URL}/become-a-referrer`;
const SYSTEM = new Set(["diy", "test-43", "sam-38", "ton-77"]);
const QUIET_DAYS = 45;
const norm = (s?: string | null) => (s || "").trim().toLowerCase();

type ChatC = { method: "whatsapp" | "telegram" | "viber"; handle: string } | null;
function pickChat(method?: string | null, handle?: string | null, contacts?: unknown): ChatC {
  const list = Array.isArray(contacts) ? (contacts as Array<{ method?: string; handle?: string; preferred?: boolean }>) : [];
  const pref = list.find(c => c.preferred && c.handle) || list.find(c => c.handle);
  let m = (pref?.method || method || "").toLowerCase();
  const h = (pref?.handle || handle || "").trim();
  if (!h) return null;
  const blob = `${m} ${h}`.toLowerCase();
  if (/telegram|t\.me|@/.test(blob)) m = "telegram";
  else if (/viber/.test(blob)) m = "viber";
  else m = "whatsapp";
  return { method: m as "whatsapp" | "telegram" | "viber", handle: h };
}

export async function GET() {
  try {
    await requireAdmin();
    const [referrers, apps] = await Promise.all([
      prisma.referrer.findMany({ select: { id: true, slug: true, name: true, email: true, contactMethod: true, contactHandle: true, contacts: true } }),
      prisma.ambassadorApplication.findMany({ select: { id: true, fullName: true, email: true, status: true, referredBy: true, referrerId: true, createdAt: true, onboardedAt: true, contactNumber: true, contactChannel: true } }),
    ]);
    // Best-effort: an email-log hiccup must not break the page (just no "contacted" badges).
    const logs = await prisma.$queryRaw<Array<{ to: string; subject: string }>>`SELECT lower("to") AS to, subject FROM email_log WHERE created_at > NOW() - INTERVAL '45 days' AND status <> 'failed'`.catch(() => []);

    // referrals per slug + latest referral date (for 1a/1b)
    const refdCount = new Map<string, number>(), lastRefd = new Map<string, number>();
    for (const a of apps) { const k = norm(a.referredBy); if (!k) continue; refdCount.set(k, (refdCount.get(k) || 0) + 1); const t = a.createdAt.getTime(); if (t > (lastRefd.get(k) || 0)) lastRefd.set(k, t); }
    const refById = new Map(referrers.map(r => [r.id, r]));

    // "already contacted" = email_log has a campaign subject to this address
    const contactedEmails = new Set<string>();
    for (const l of logs) {
      if (["Your first referral could pay ₱1,000", "You know how it works, now earn from it", "You can still earn with LinkedVelocity"].includes(l.subject) || l.subject.startsWith("Your referral link still works,")) contactedEmails.add(norm(l.to));
    }

    const rows: OutreachRow[] = [];
    const takenEmails = new Set<string>();   // dedupe a person across tables/segments
    const takenRefIds = new Set<string>();

    // 1 — referrers (link is their own /r/<slug>)
    for (const r of referrers) {
      if (SYSTEM.has(r.slug)) continue;
      const n = refdCount.get(norm(r.slug)) || 0;
      const last = lastRefd.get(norm(r.slug));
      let seg: OutreachSegment | null = null;
      if (n === 0) seg = "1a";
      else if (last && last < Date.now() - QUIET_DAYS * 864e5) seg = "1b";
      if (!seg) continue;
      const chat = pickChat(r.contactMethod, r.contactHandle, r.contacts);
      rows.push({ kind: "referrer", id: r.id, name: r.name, segment: seg, email: r.email || null, chatMethod: chat?.method || null, chatHandle: chat?.handle || null, link: `${APP_URL}/r/${r.slug}`, isSignup: false, contacted: !!r.email && contactedEmails.has(norm(r.email)) });
      if (r.email) takenEmails.add(norm(r.email));
      takenRefIds.add(r.id);
    }

    // 2 / 3 — ambassadors (link = their linked referrer's /r/<slug>, else the signup CTA)
    for (const a of apps) {
      if (a.email && takenEmails.has(norm(a.email))) continue;
      if (a.referrerId && takenRefIds.has(a.referrerId)) continue;
      const restricted = a.status === "rejected" || a.status === "unreachable" || (!a.onboardedAt && a.status !== "onboarded");
      let seg: OutreachSegment | null = null;
      if (a.status === "onboarded") seg = "2";
      else if (restricted) seg = "3";
      if (!seg) continue;
      const linkedRef = a.referrerId ? refById.get(a.referrerId) : null;
      const chat = pickChat(a.contactChannel, a.contactNumber, null);
      rows.push({ kind: "ambassador", id: a.id, name: a.fullName, segment: seg, email: a.email || null, chatMethod: chat?.method || null, chatHandle: chat?.handle || null, link: linkedRef ? `${APP_URL}/r/${linkedRef.slug}` : SIGNUP_URL, isSignup: !linkedRef, contacted: !!a.email && contactedEmails.has(norm(a.email)) });
      if (a.email) takenEmails.add(norm(a.email));
    }

    const counts = rows.reduce((m, r) => { m[r.segment] = (m[r.segment] || 0) + 1; return m; }, {} as Record<string, number>);
    return NextResponse.json({ rows, counts });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500 });
  }
}
