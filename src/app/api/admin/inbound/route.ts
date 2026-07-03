import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Editable fields shared by manual-create + edit.
type LeadInput = {
  channel?: string;
  name?: string;
  handle?: string | null;
  companyEmail?: string | null;
  type?: string | null;
  message?: string | null;
  status?: string;
  replied?: boolean;
  followUpDate?: string | null;
  outcome?: string | null;
  notes?: string | null;
  stage?: string;
  ownerEmail?: string | null;
  firstContactAt?: string | null;
};

function toData(b: LeadInput) {
  const d: Record<string, unknown> = {};
  if (typeof b.channel === "string") d.channel = b.channel;
  if (typeof b.name === "string") d.name = b.name;
  if (b.handle !== undefined) d.handle = b.handle || null;
  if (b.companyEmail !== undefined) d.companyEmail = b.companyEmail || null;
  if (b.type !== undefined) d.type = b.type || null;
  if (b.message !== undefined) d.message = b.message || null;
  if (typeof b.status === "string") d.status = b.status;
  if (typeof b.replied === "boolean") d.replied = b.replied;
  if (b.followUpDate !== undefined) d.followUpDate = b.followUpDate ? new Date(b.followUpDate) : null;
  if (b.outcome !== undefined) d.outcome = b.outcome || null;
  if (b.notes !== undefined) d.notes = b.notes || null;
  if (typeof b.stage === "string") d.stage = b.stage;
  if (b.ownerEmail !== undefined) d.ownerEmail = b.ownerEmail || null;
  if (b.firstContactAt) d.firstContactAt = new Date(b.firstContactAt);
  return d;
}

type Comm = { ts: string; channel: string; body: string };

// List inbound leads (Telegram messagers, manually-added website/call leads).
export async function GET() {
  try {
    await requireAdmin();
    const leads = await prisma.inboundLead.findMany({ orderBy: { firstContactAt: "desc" } });
    return NextResponse.json({ leads });
  } catch (error) {
    return err(error);
  }
}

// Manually add a lead (the ones we can't automate — website, referrals, etc.).
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = (await req.json()) as LeadInput;
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const data = toData(body);
    const lead = await prisma.inboundLead.create({
      data: {
        channel: (body.channel || "website").toString(),
        name: body.name.trim(),
        ...data,
      },
    });
    return NextResponse.json({ ok: true, lead });
  } catch (error) {
    return err(error);
  }
}

// Edit any field on a lead.
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = (await req.json()) as LeadInput & { id?: string; addNote?: { channel?: string; body?: string } };
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const data = toData(body);
    // Append a timestamped comms entry to the timeline (and bump last-contact).
    const noteBody = (body.addNote?.body || "").trim();
    if (noteBody) {
      const existing = await prisma.inboundLead.findUnique({ where: { id: body.id }, select: { commsLog: true } });
      const log = (Array.isArray(existing?.commsLog) ? existing!.commsLog : []) as Comm[];
      log.unshift({ ts: new Date().toISOString(), channel: (body.addNote?.channel || "note").trim(), body: noteBody });
      data.commsLog = log;
      data.lastContactAt = new Date();
    }
    const lead = await prisma.inboundLead.update({ where: { id: body.id }, data });
    return NextResponse.json({ ok: true, lead });
  } catch (error) {
    return err(error);
  }
}

// Delete a lead.
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await prisma.inboundLead.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return err(error);
  }
}

function err(error: unknown) {
  const msg = error instanceof Error ? error.message : "Unknown error";
  if (msg === "Forbidden" || msg === "Unauthorized") {
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }
  console.error("inbound api error:", msg);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
