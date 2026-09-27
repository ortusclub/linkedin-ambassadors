import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

import { submittedApplicationsWhere } from "@/lib/application-ownership";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Only allow deleting own submissions
    const submission = await prisma.ambassadorApplication.findFirst({ where: { id, ...submittedApplicationsWhere(user) } });
    if (!submission) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.ambassadorApplication.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
