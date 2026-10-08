import { ImageResponse } from "next/og";

// Generated OG/link-preview image for LinkedArmy (brand.ogImage points here). Avoids a
// missing static /linkedarmy-og.png so shared links don't render a broken preview.
export const runtime = "nodejs";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0F2439 0%, #0A1826 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em" }}>LinkedArmy</div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 800, lineHeight: 1.05, marginTop: 28, maxWidth: 1000 }}>
          Hire verified LinkedIn Operators
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#AFC0D6", marginTop: 24, maxWidth: 900 }}>
          Established networks that run your outreach — hit pipeline targets in weeks, not quarters.
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
