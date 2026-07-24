import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getOwners } from "@/lib/owners";

async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}

export async function GET() {
  try {
    await requireAdmin();

    // Single source of truth — shared with the Google-Sheets CSV export.
    const owners = await getOwners();

    return NextResponse.json({ owners });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Owners API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
