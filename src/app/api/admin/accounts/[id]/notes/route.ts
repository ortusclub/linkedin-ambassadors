import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
    const parsed = z.object({ text: z.string().trim().min(1).max(10000) }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter a note of 1–10,000 characters" }, { status: 400 });
    const at = new Date();
    const entry = `[${at.toISOString()}] ${parsed.data.text}`;
    // Append atomically, preserving existing notes (including Owner: linkage).
    // Display order is handled by the timeline; concurrent writers don't overwrite.
    const rows = await prisma.$queryRaw<Array<{ notes: string }>>`
      UPDATE linkedin_accounts
      SET notes = concat_ws(E'\n', nullif(notes, ''), ${entry}), updated_at = ${at}
      WHERE id = ${id}::uuid
      RETURNING notes
    `;
    if (!rows.length) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ notes: rows[0].notes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? "Could not save note" : message }, { status });
  }
}
