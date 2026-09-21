import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function authError(error: unknown) {
  if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Forbidden" ? 403 : 401 });
  }
  return null;
}

// Admin edits a referrer — their contact + payout details (so the team can pay them
// even if the marketer didn't fill their own portal), plus name/type.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const str = (v: unknown) => (typeof v === "string" ? v : undefined);
    // contacts: array of { method, handle, preferred? }. We keep only entries with a
    // handle, and mirror the preferred one (or the first) into contactMethod/contactHandle
    // so existing readers (cards, portal, directory) still see the main contact.
    let contacts: { method: string; handle: string; preferred: boolean }[] | undefined;
    let mirror: { method?: string; handle?: string } = {};
    if (Array.isArray(body.contacts)) {
      contacts = body.contacts
        .map((c: { method?: unknown; handle?: unknown; preferred?: unknown }) => ({
          method: typeof c.method === "string" && c.method ? c.method : "WhatsApp",
          handle: typeof c.handle === "string" ? c.handle.trim() : "",
          preferred: !!c.preferred,
        }))
        .filter((c: { handle: string }) => c.handle);
      if (contacts && contacts.length) {
        const pref = contacts.find((c) => c.preferred) || contacts[0];
        // ensure exactly one preferred flag is set
        contacts = contacts.map((c) => ({ ...c, preferred: c === pref }));
        mirror = { method: pref.method, handle: pref.handle };
      } else {
        mirror = { method: undefined, handle: undefined };
      }
    }
    const referrer = await prisma.referrer.update({
      where: { id },
      data: {
        name: body.name?.trim() ? body.name.trim() : undefined,
        type: body.type === "marketer" || body.type === "ambassador" ? body.type : undefined,
        email: body.email === null ? null : str(body.email)?.trim() ?? undefined,
        contacts: contacts === undefined ? undefined : contacts,
        contactMethod: contacts !== undefined ? (mirror.method ?? null) : str(body.contactMethod),
        contactHandle: contacts !== undefined ? (mirror.handle ?? null) : str(body.contactHandle),
        paymentMethod: str(body.paymentMethod),
        paymentDetails: str(body.paymentDetails),
      },
    });
    return NextResponse.json({ referrer });
  } catch (error) {
    return authError(error) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.referrer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authError(error) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
