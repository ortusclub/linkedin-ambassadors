import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  sendRenewalReminder3d,
  sendRenewalGraceNotice,
  sendRenewalWinBack,
  sendRenewalConfirmation,
  sendRenewalLinkEmail,
  sendRenewalHeadsUp,
  sendPaymentFailedEmail,
  sendAccessRevokedEmail,
  sendTopUpConfirmation,
  sendTopUpNotification,
} from "@/services/email";

// Admin-only preview: sends every renewal email (both cadences) to ?to=<email>
// (default milee@linkedvelocity.com) with sample data, so we can review the look.
// Open this URL in the browser while logged in as an admin.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const to = req.nextUrl.searchParams.get("to") || "milee@linkedvelocity.com";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://linkedvelocity.com";
    const link = `${appUrl}/dashboard`; // sample CTA target for the preview
    const name = "Milee";
    const amount = "$72";

    const sent: string[] = [];
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const send = async (label: string, fn: () => Promise<unknown>) => {
      try { await fn(); sent.push(label); } catch (e) { sent.push(`${label} (FAILED: ${e instanceof Error ? e.message : "err"})`); }
      await sleep(700); // stay under Resend's ~2/sec rate limit
    };

    // Auto-renew OFF cadence
    await send("OFF · reminder (3d)", () => sendRenewalReminder3d(to, name, link, "July 7, 2026", amount));
    await send("OFF · grace notice", () => sendRenewalGraceNotice(to, name, link, "July 8, 2026", amount));
    await send("OFF · win-back (+7d)", () => sendRenewalWinBack(to, name, link, amount));
    await send("OFF · manual renewal link", () => sendRenewalLinkEmail(to, name, link, "July 7, 2026", amount));
    // Shared
    await send("renewal confirmed", () => sendRenewalConfirmation(to));
    // Auto-renew ON
    await send("ON · heads-up", () => sendRenewalHeadsUp(to, name, "July 7, 2026"));
    await send("ON · payment hiccup (dunning)", () => sendPaymentFailedEmail(to, name, link));
    await send("ON · access paused", () => sendAccessRevokedEmail(to, name, link));
    // Top-up flow (new) — customer receipt (card + crypto) + the internal admin alert
    await send("TOPUP · customer receipt (card)", () => sendTopUpConfirmation({ email: to, amount: 25, method: "card", newBalance: 125 }));
    await send("TOPUP · customer receipt (crypto)", () => sendTopUpConfirmation({ email: to, amount: 50, method: "crypto", newBalance: 175 }));
    await send("TOPUP · admin alert (card)", () => sendTopUpNotification({ customerEmail: to, customerName: name, amount: 25, method: "card" }));

    return NextResponse.json({ ok: true, to, sent });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg === "Forbidden" || msg === "Unauthorized") {
      return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
