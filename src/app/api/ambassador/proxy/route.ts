import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getNextProxy } from "@/lib/proxy-pool";

export async function GET() {
  try {
    await requireAuth();
    const proxy = getNextProxy();
    return NextResponse.json({ proxy });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
