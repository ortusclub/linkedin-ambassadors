import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { incidentSteps, mailTypeLabel } from "@/lib/account-mail";
import { sendAccountMailAlert } from "@/services/email";

const EVENT_SELECT = {
  id: true, receivedAt: true, fromAddr: true, subject: true, bodyText: true,
  type: true, severity: true, status: true, locationLabel: true,
  actionedBy: true, actionedAt: true, incidentOpenedAt: true, resolution: true,
} as const;

function summarize(events: { status: string }[]) {
  return {
    logged: events.filter((e) => e.status === "logged").length,
    needReview: events.filter((e) => e.status === "needs_review").length,
    acknowledged: events.filter((e) => e.status === "acknowledged").length,
    incidents: events.filter((e) => e.status === "incident").length,
    resolved: events.filter((e) => e.status === "resolved").length,
  };
}

function errResponse(e: unknown) {
  const msg = e instanceof Error ? e.message : "error";
  const code = msg === "Forbidden" ? 403 : msg === "Unauthorized" ? 401 : 500;
  return NextResponse.json({ error: msg }, { status: code });
}

// Captured LinkedIn account-security emails for one account, newest first, plus a summary strip.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const events = await prisma.accountMailEvent.findMany({
      where: { linkedinAccountId: id },
      orderBy: { receivedAt: "desc" },
      take: 200,
      select: EVENT_SELECT,
    });
    return NextResponse.json({ events, summary: summarize(events) });
  } catch (e) {
    return errResponse(e);
  }
}

// Triage one event: it_was_us (resolved, benign), we_know (acknowledged/monitoring),
// wasnt_us (open an incident + email the team), resolve (close an incident), undo (back to the
// email's default state). Returns the updated event + fresh summary so the UI can patch in place.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { eventId, action } = (await req.json()) as { eventId?: string; action?: string };
    if (!eventId || !action) return NextResponse.json({ error: "eventId and action required" }, { status: 400 });

    const ev = await prisma.accountMailEvent.findFirst({
      where: { id: eventId, linkedinAccountId: id },
      select: { id: true, type: true, severity: true, subject: true, receivedAt: true },
    });
    if (!ev) return NextResponse.json({ error: "not found" }, { status: 404 });

    const who = admin.fullName || admin.email;
    const now = new Date();
    let data: Record<string, unknown>;
    let fireAlert = false;

    switch (action) {
      case "it_was_us":
        data = { status: "resolved", actionedBy: who, actionedAt: now, resolution: "Confirmed ours", incidentOpenedAt: null };
        break;
      case "we_know":
        data = { status: "acknowledged", actionedBy: who, actionedAt: now };
        break;
      case "wasnt_us":
        // Status "incident" (not severity) drives the red UI + row flag, so undo can still restore
        // the event's original review/benign state.
        data = { status: "incident", actionedBy: who, actionedAt: now, incidentOpenedAt: now, resolution: null };
        fireAlert = true;
        break;
      case "resolve":
        data = { status: "resolved", actionedBy: who, actionedAt: now, resolution: "Incident resolved" };
        break;
      case "undo":
        data = {
          status: ev.severity === "benign" ? "logged" : "needs_review",
          actionedBy: null, actionedAt: null, incidentOpenedAt: null, resolution: null,
        };
        break;
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }

    const updated = await prisma.accountMailEvent.update({ where: { id: eventId }, data, select: EVENT_SELECT });

    if (fireAlert) {
      // Never let a mail hiccup fail the triage write — the incident is already recorded.
      try {
        const account = await prisma.linkedInAccount.findUnique({ where: { id }, select: { linkedinName: true } });
        await sendAccountMailAlert({
          accountName: account?.linkedinName || "(unnamed account)",
          accountId: id,
          type: ev.type,
          typeLabel: mailTypeLabel(ev.type),
          subject: ev.subject,
          receivedAt: ev.receivedAt,
          openedBy: who,
          steps: incidentSteps(ev.type),
        });
      } catch (mailErr) {
        console.error("account-mail incident alert", mailErr);
      }
    }

    const events = await prisma.accountMailEvent.findMany({
      where: { linkedinAccountId: id }, orderBy: { receivedAt: "desc" }, take: 200, select: EVENT_SELECT,
    });
    return NextResponse.json({ event: updated, summary: summarize(events) });
  } catch (e) {
    return errResponse(e);
  }
}
