import { NextResponse } from "next/server";
import { z } from "zod";
import { sendTestAccountLead } from "@/services/email";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email } = schema.parse(body);

    await sendTestAccountLead(name, email);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("Test account lead error:", error);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
