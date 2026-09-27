import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (typeof body.id !== "string" || !["ambassador", "referrer", "crm"].includes(body.destination)) return NextResponse.json({ error: "Choose a valid destination." }, { status: 400 });
    const result = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(27154000)`;
      const lead = await tx.inboundLead.findUnique({ where: { id: body.id } });
      if (!lead) throw new Error("Contact not found.");
      const email = (typeof body.email === "string" ? body.email : lead.companyEmail || "").trim().toLowerCase();
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const contactMethod = lead.channel.toLowerCase() === "telegram" ? "Telegram" : lead.channel.toLowerCase() === "whatsapp" ? "WhatsApp" : null;
      const contactHandle = lead.handle || null;
      let patch: Record<string, unknown>;
      if (body.destination === "crm") {
        patch = { addedToClientCrm: true };
      } else if (body.destination === "ambassador") {
        let app = lead.ambassadorApplicationId ? await tx.ambassadorApplication.findUnique({ where: { id: lead.ambassadorApplicationId } }) : null;
        if (!app) {
          if (!validEmail) throw new Error("A valid contact email is required for the Ambassador Pipeline.");
          const matches = await tx.ambassadorApplication.findMany({ where: { email: { equals: email, mode: "insensitive" } }, take: 2 });
          if (matches.length > 1) throw new Error("Multiple ambassador records use this email. Resolve the duplicate records first.");
          app = matches[0] || null;
          if (!app) {
            const owner = lead.ownerEmail ? await tx.user.findUnique({ where: { email: lead.ownerEmail }, select: { fullName: true } }) : null;
            app = await tx.ambassadorApplication.create({ data: { fullName: lead.name, email, linkedinUrl: "", status: "pending", poc: lead.ownerEmail === "ardi@linkedvelocity.com" ? "Ardi" : owner?.fullName || lead.ownerEmail, contactChannel: contactMethod, contactNumber: contactHandle, referralSource: `Inbound: ${lead.channel}`, adminNotes: [lead.message, lead.notes].filter(Boolean).join("\n\n") || null } });
          }
        }
        patch = { addedToAmbassadorPipeline: true, ambassadorApplicationId: app.id, ...(validEmail && !lead.companyEmail ? { companyEmail: email } : {}) };
      } else {
        let referrer = lead.referrerId ? await tx.referrer.findUnique({ where: { id: lead.referrerId } }) : null;
        if (!referrer) {
          const conditions = [...(validEmail ? [{ email: { equals: email, mode: "insensitive" as const } }] : []), ...(contactMethod && contactHandle ? [{ contactMethod, contactHandle: { equals: contactHandle, mode: "insensitive" as const } }] : [])];
          const matches = conditions.length ? await tx.referrer.findMany({ where: { OR: conditions }, take: 2 }) : [];
          if (matches.length > 1) throw new Error("Multiple referrers match this contact. Resolve the duplicate records first.");
          referrer = matches[0] || null;
          if (!referrer) {
            if (!validEmail && !contactHandle) throw new Error("Add a contact email or Telegram handle before creating a referrer.");
            const prefix = lead.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || "ref";
            referrer = await tx.referrer.create({ data: { name: lead.name, email: validEmail ? email : null, slug: `${prefix}-${randomBytes(5).toString("hex")}`, token: randomBytes(18).toString("base64url"), type: "marketer", channel: lead.channel, contactMethod, contactHandle } });
          }
        }
        patch = { addedToReferralPipeline: true, referrerId: referrer.id, ...(validEmail && !lead.companyEmail ? { companyEmail: email } : {}) };
      }
      return tx.inboundLead.update({ where: { id: lead.id }, data: patch });
    });
    return NextResponse.json({ lead: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized" || message === "Forbidden") return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 403 });
    const safe = ["Contact not found.", "A valid contact email is required for the Ambassador Pipeline.", "Multiple ambassador records use this email. Resolve the duplicate records first.", "Multiple referrers match this contact. Resolve the duplicate records first.", "Add a contact email or Telegram handle before creating a referrer."];
    return NextResponse.json({ error: safe.includes(message) ? message : "Could not add the contact. Please try again." }, { status: safe.includes(message) ? 400 : 500 });
  }
}
