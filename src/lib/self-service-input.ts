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
  accountFreshness: z.enum(["fresh", "established"]),
  paymentMethod: z.string().trim().min(1).max(40),
  paymentDetails: z.string().trim().min(3).max(500),
  payoutName: z.string().trim().min(2).max(120),
  consent: z.literal(true),
});

export const selfServiceAction = z.object({
  id: z.string().uuid(),
  action: z.enum(["prepare", "opened", "confirm"]),
});
