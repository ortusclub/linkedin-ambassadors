import { NextResponse } from "next/server";

const GITHUB_RELEASE_URL =
  "https://api.github.com/repos/ortusclub/linkedin-ambassadors/releases/tags/v1.0.2";

export async function GET() {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "Download not configured" }, { status: 500 });
    }

    // Get the release assets
    const releaseRes = await fetch(GITHUB_RELEASE_URL, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!releaseRes.ok) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    const release = await releaseRes.json();
    const asset = release.assets?.find((a: { name: string }) => a.name.endsWith(".dmg"));

    if (!asset) {
      return NextResponse.json({ error: "DMG not found in release" }, { status: 404 });
    }

    // Download the asset
    const assetRes = await fetch(asset.url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/octet-stream",
      },
    });

    if (!assetRes.ok || !assetRes.body) {
      return NextResponse.json({ error: "Failed to download" }, { status: 500 });
    }

    return new NextResponse(assetRes.body, {
      headers: {
        "Content-Type": "application/x-apple-diskimage",
        "Content-Disposition": 'attachment; filename="Klabber.dmg"',
        "Content-Length": asset.size.toString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
