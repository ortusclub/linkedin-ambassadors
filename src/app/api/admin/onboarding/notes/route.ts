import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

// Save the internal chasing notes for one application — what's been done to reach
// them and where things stand. Writes AmbassadorApplication.adminNotes, the same
// field the row already surfaces read-only, so the note sticks across reloads and
// shows anywhere adminNotes is read.

const schema = z.object({
  id: z.string().uuid(),
  adminNotes: z.string().max(5000),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { id, adminNotes } = schema.parse(await req.json());

    const trimmed = adminNotes.trim();
    const updated = await prisma.ambassadorApplication.update({
      where: { id },
      data: { adminNotes: trimmed || null },
      select: { id: true, adminNotes: true },
    });

    return NextResponse.json({ application: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === "Forbidden" || error.message === "Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
