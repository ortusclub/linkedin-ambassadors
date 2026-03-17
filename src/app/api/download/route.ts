import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.redirect(
    "https://github.com/ortusclub/linkedin-ambassadors/releases/latest/download/Klabber-1.0.2-arm64.dmg"
  );
}
