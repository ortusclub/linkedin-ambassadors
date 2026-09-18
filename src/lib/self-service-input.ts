import { z } from "zod";

export function canonicalLinkedinUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || !/^(www\.)?linkedin\.com$/i.test(url.hostname) ||
      !/^\/in\/[^/]+\/?$/.test(url.pathname) || url.username || url.password || url.port) {
    throw new Error("Enter a LinkedIn profile URL, for example https://www.linkedin.com/in/your-name");
  }
  return `https://www.linkedin.com${url.pathname.replace(/\/$/, "").toLowerCase()}`;
}

export const selfServiceInput = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform((s) => s.toLowerCase()),
  linkedinUrl: z.string().trim().max(500).transform((s, ctx) => {
    try { return canonicalLinkedinUrl(s); } catch {
      ctx.addIssue({ code: "custom", message: "Enter a valid LinkedIn profile URL (https://www.linkedin.com/in/your-name)." });
      return z.NEVER;
    }
  }),
  country: z.string().trim().min(2).max(100),
  contactNumber: z.string().trim().min(5).max(100),
  phoneVerificationToken: z.string().trim().max(2000).optional().default(""),
  accountFreshness: z.enum(["fresh", "established", "unknown"]),
  paymentMethod: z.string().trim().min(1).max(40),
  paymentDetails: z.string().trim().max(500),
  payoutName: z.string().trim().min(2).max(120),
  bankName: z.string().trim().max(120).optional().default(""),
  bankAccountNumber: z.string().trim().max(120).optional().default(""),
  bankRoutingNumber: z.string().trim().max(120).optional().default(""),
  hasGovernmentId: z.boolean().optional().default(false),
  nameMatchesId: z.boolean().optional().default(false),
  ownerPhotoUrl: z.string().trim().max(1000).optional().default(""),
  consent: z.literal(true),
}).superRefine((input, ctx) => {
  const details = input.paymentDetails.trim();
  if (input.paymentMethod === "Bank transfer") {
    if (input.bankName.length < 2) ctx.addIssue({ code: "custom", path: ["bankName"], message: "Enter the bank name." });
    if (input.bankAccountNumber.length < 3) ctx.addIssue({ code: "custom", path: ["bankAccountNumber"], message: "Enter the account number or IBAN." });
    // Routing / IFSC / sort / SWIFT is optional — PH bank transfers don't need one.
    return;
  }
  if (details.length < 3) {
    ctx.addIssue({ code: "custom", path: ["paymentDetails"], message: "Enter the payout account details." });
    return;
  }
  if (["PayPal", "Wise"].includes(input.paymentMethod) && !z.string().email().safeParse(details).success) {
    ctx.addIssue({ code: "custom", path: ["paymentDetails"], message: `Enter the email address registered to ${input.paymentMethod}.` });
  }
  if (input.paymentMethod === "UPI" && !/^[\w.-]{2,}@[a-zA-Z0-9.-]{2,}$/.test(details)) {
    ctx.addIssue({ code: "custom", path: ["paymentDetails"], message: "Enter a valid UPI ID, for example name@bank." });
  }
  if (["GCash", "Maya"].includes(input.paymentMethod) && details.replace(/\D/g, "").length < 10) {
    ctx.addIssue({ code: "custom", path: ["paymentDetails"], message: `Enter the mobile number registered to ${input.paymentMethod}, including country code.` });
  }
}).transform((input) => input.paymentMethod === "Bank transfer"
  ? { ...input, paymentDetails: [input.bankName, input.bankAccountNumber, input.bankRoutingNumber].map((s) => s.trim()).filter(Boolean).join(" · ") }
  : input);

export const selfServiceAction = z.object({
  id: z.string().uuid(),
  action: z.enum(["prepare", "opened", "confirm"]),
});

// Confirm the PC sign-in and, at the same time, capture the login so LinkedVelocity
// holds it (mirrors the phone hand-off). Credentials are optional so an older client
// or a referrer who genuinely can't provide them can still confirm.
export const selfServiceConfirm = z.object({
  id: z.string().uuid(),
  action: z.literal("confirm"),
  password: z.string().min(6).max(128).optional(),
  twoFactorKey: z.string().trim().max(128).transform((s) => s.replace(/\s+/g, "").toUpperCase()).optional().default(""),
});

// Phone hand-off: capture the login so LinkedVelocity signs in (referrer has no PC).
export const selfServiceHandoff = z.object({
  id: z.string().uuid(),
  action: z.literal("handoff"),
  password: z.string().min(6).max(128),
  twoFactorKey: z.string().trim().max(128).transform((s) => s.replace(/\s+/g, "").toUpperCase()).optional().default(""),
});
