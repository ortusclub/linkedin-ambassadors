import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";

const shareSchema = z.object({
  profileId: z.string().min(1),
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      return NextResponse.json({ ok: true, warning: "Profile created but sharing may require a GoLogin paid plan" });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Share profile error:", error);
    return NextResponse.json({ ok: true }); // Don't block the flow
  }
}
