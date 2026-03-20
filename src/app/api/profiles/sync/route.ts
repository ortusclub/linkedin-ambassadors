import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

// Returns R2 credentials for the Electron app to sync profiles
export async function GET() {
  try {
    await requireAuth();

    return NextResponse.json({
      endpoint: process.env.S3_ENDPOINT,
      bucket: process.env.S3_BUCKET_NAME,
      region: process.env.S3_REGION || "auto",
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
