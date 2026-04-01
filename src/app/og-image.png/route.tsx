import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1D1B16 0%, #2a2720 50%, #1D1B16 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "16px",
            background: "#C5A255",
            marginBottom: "32px",
            fontSize: "36px",
            fontWeight: 700,
            color: "#fff",
          }}
        >
          kl
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: 700,
            color: "#FFFFFF",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: "16px",
          }}
        >
          Rent Premium LinkedIn Accounts
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "24px",
            color: "rgba(255,255,255,0.7)",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.5,
            marginBottom: "40px",
          }}
        >
          Pre-warmed, verified accounts for outreach & lead generation. Instant access, cancel anytime.
        </div>

        {/* Price badge */}
        <div
          style={{
            display: "flex",
            gap: "16px",
          }}
        >
          <div
            style={{
              padding: "12px 28px",
              borderRadius: "8px",
              background: "#C5A255",
              color: "#fff",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            From $10/month
          </div>
          <div
            style={{
              padding: "12px 28px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              fontSize: "18px",
              fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            klabber.co
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
