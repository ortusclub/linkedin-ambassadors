import { NextResponse } from "next/server";
import { z } from "zod";

const shareSchema = z.object({
  profileId: z.string().min(1),
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = shareSchema.parse(body);

    const token = process.env.GOLOGIN_API_TOKEN!;

    // Share the GoLogin profile with the ambassador's email
    const res = await fetch(`https://api.gologin.com/browser/${data.profileId}/share`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: data.email }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("GoLogin share error:", errText);
      // Don't fail the flow — sharing might not be available on all plans
      return NextResponse.json({ ok: true, warning: "Profile created but sharing may require a GoLogin paid plan" });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Share profile error:", error);
    return NextResponse.json({ ok: true }); // Don't block the flow
  }
}
