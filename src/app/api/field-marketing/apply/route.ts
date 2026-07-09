import { NextResponse } from "next/server";
import { z } from "zod";
import { sendFieldMarketingLead } from "@/services/email";

const applySchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  contactNumber: z.string().min(1),
  comfortApproaching: z.string().optional(),
  handlesRejection: z.string().optional(),
  experience: z.string().optional(),
  trialAvailability: z.string().optional(),
  source: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = applySchema.parse(body);

    // Append the applicant as a row to the Google Sheet (via Apps Script webhook).
    // If the webhook isn't configured yet, we skip it — the email still fires.
    const webhook = process.env.FIELD_MARKETING_SHEET_WEBHOOK;
    if (webhook) {
      try {
        await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            fullName: data.fullName,
            email: data.email,
            contactNumber: data.contactNumber,
            comfortApproaching: data.comfortApproaching || "",
            handlesRejection: data.handlesRejection || "",
            experience: data.experience || "",
            trialAvailability: data.trialAvailability || "",
            source: data.source || "Website",
          }),
        });
      } catch (sheetError) {
        console.error("Field marketing sheet append failed:", sheetError);
      }
    }

    // Email notification to Sam.
    try {
      await sendFieldMarketingLead({
        fullName: data.fullName,
        email: data.email,
        contactNumber: data.contactNumber,
        comfortApproaching: data.comfortApproaching,
        handlesRejection: data.handlesRejection,
        experience: data.experience,
        trialAvailability: data.trialAvailability,
        source: data.source || "Website",
      });
    } catch (emailError) {
      console.error("Field marketing lead email failed:", emailError);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Field marketing apply error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
