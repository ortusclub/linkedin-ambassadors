import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}
const from = process.env.RESEND_FROM_EMAIL || "noreply@linkedinambassadors.com";
// Where internal admin notifications (top-ups, rentals) are sent.
const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "info@klabber.co";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: EmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email] Would send to ${to}: ${subject}`);
    return;
  }
  return getResend().emails.send({ from, to, subject, html });
}

export async function sendVerificationCode(email: string, code: string) {
  return sendEmail({
    to: email,
    subject: `Your LinkedVelocity verification code: ${code}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
        <h2 style="color:#2563eb;margin-bottom:8px;">LinkedVelocity</h2>
        <p style="color:#374151;font-size:15px;">Enter this code to sign in:</p>
        <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
          <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#111827;">${code}</span>
        </div>
        <p style="color:#6b7280;font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#6b7280;font-size:13px;margin-top:24px;">&mdash; The LinkedVelocity Team</p>
      </div>
    `,
  });
}

// Shared branded wrapper so all customer emails look consistent.
function brandWrap(inner: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://linkedvelocity.com";
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:36px 24px;color:#0F1419;">
      <h2 style="color:#0A66C2;margin:0 0 24px;font-size:22px;letter-spacing:-0.02em;">LinkedVelocity</h2>
      ${inner}
      <p style="color:#8899A6;font-size:12px;margin-top:32px;border-top:1px solid #E8E6E1;padding-top:16px;">
        Need help? Just reply to this email. &nbsp;·&nbsp;
        <a href="${appUrl}/dashboard" style="color:#0A66C2;text-decoration:none;">Your dashboard</a>
      </p>
      <p style="color:#8899A6;font-size:12px;margin-top:8px;">&mdash; The LinkedVelocity Team</p>
    </div>
  `;
}

// Sent right after a user signs up — the most important touchpoint. Welcomes them
// and points to the guide so they know exactly how it all works before renting.
export async function sendSignupWelcomeEmail(email: string, fullName: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://linkedvelocity.com";
  const firstName = (fullName || "").trim().split(" ")[0] || "there";
  return sendEmail({
    to: email,
    subject: `Welcome to LinkedVelocity, ${firstName} 👋`,
    html: brandWrap(`
      <p style="font-size:16px;margin:0 0 8px;"><strong>Welcome aboard, ${firstName}!</strong></p>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">LinkedVelocity gives you access to real, established LinkedIn accounts so you can scale your outreach without creating new profiles or hiring more people.</p>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">Here's everything you need to get started — how it works, setting up GoLogin, daily limits, and using your account safely:</p>
      <a href="${appUrl}/guide" style="display:inline-block;background:#0A66C2;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;margin-bottom:14px;">Read the getting-started guide</a>
      <p style="font-size:14px;color:#536471;line-height:1.6;margin:14px 0 0;">Ready to dive in? <a href="${appUrl}/catalogue" style="color:#0A66C2;font-weight:600;">Browse available accounts →</a></p>
    `),
  });
}

// Sent immediately after payment (card or USDC). Access is granted by our team
// after vetting + freeing the account internally — so this email is about what to
// do NOW (set up GoLogin) and what to expect, not "you're live yet".
export async function sendRentalOnboardingEmail(email: string, accountName: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://linkedvelocity.com";
  return sendEmail({
    to: email,
    subject: `You're in! Let's get "${accountName}" ready for you`,
    html: brandWrap(`
      <p style="font-size:16px;margin:0 0 8px;"><strong>Thanks for your rental — ${accountName} is reserved for you. 🎉</strong></p>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">Here's exactly what happens next. Step 1 is on you and takes 2 minutes — please do it now so we can hand over access smoothly.</p>

      <div style="background:#F3F8FE;border:1px solid #D6E3F2;border-radius:12px;padding:18px 20px;margin-bottom:14px;">
        <p style="margin:0 0 4px;font-weight:700;font-size:15px;color:#0A66C2;">Step 1 — Set up GoLogin (do this now)</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">Download the free <strong>GoLogin</strong> app from <a href="https://gologin.com/download" style="color:#0A66C2;">gologin.com/download</a> and create your account using <strong>this exact email (${email})</strong>. This is important — we can only share the account with the GoLogin account on this email.</p>
      </div>

      <div style="background:#F7F7F4;border:1px solid #E8E6E1;border-radius:12px;padding:18px 20px;margin-bottom:14px;">
        <p style="margin:0 0 4px;font-weight:700;font-size:15px;">Step 2 — We get it ready (within 24 hours)</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">Our team prepares and verifies the account, then shares the profile to your GoLogin. Sharing can take a few minutes to appear after we send it.</p>
      </div>

      <div style="background:#F7F7F4;border:1px solid #E8E6E1;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-weight:700;font-size:15px;">Step 3 — You're live</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">You'll get a "your account is ready" email. Open the profile from GoLogin (or your dashboard) and you're in — LinkedIn already logged in.</p>
      </div>

      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px;">New to this? Read our short guide on <a href="${appUrl}/guide" style="color:#0A66C2;font-weight:600;">how renting works &amp; using LinkedIn safely with us →</a></p>

      <a href="${appUrl}/guide" style="display:inline-block;background:#0A66C2;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;">Read the renting guide</a>
    `),
  });
}

// Fired automatically when an admin clicks "Grant access" — the renter is now live.
export async function sendAccessReadyEmail(email: string, accountName: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://linkedvelocity.com";
  return sendEmail({
    to: email,
    subject: `Your LinkedIn account "${accountName}" is ready 🎉`,
    html: brandWrap(`
      <p style="font-size:16px;margin:0 0 8px;"><strong>You're live — ${accountName} is ready to use.</strong></p>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">We've shared the account to your GoLogin (<strong>${email}</strong>). Here's how to open it:</p>
      <ol style="font-size:14px;color:#374151;line-height:1.8;margin:0 0 24px;padding-left:20px;">
        <li>Open the <strong>GoLogin</strong> app (signed in with ${email}).</li>
        <li>Find the shared profile in your dashboard — it may take a few minutes to appear.</li>
        <li>Click <strong>Start</strong> to launch the browser with LinkedIn already logged in.</li>
      </ol>
      <a href="${appUrl}/dashboard" style="display:inline-block;background:#0A66C2;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;margin-bottom:20px;">Open your dashboard</a>
      <p style="font-size:13px;color:#536471;line-height:1.6;margin:20px 0 0;">Reminder: please follow our <a href="${appUrl}/guide" style="color:#0A66C2;">safe-use guide</a> to keep the account healthy. Always access it through GoLogin, and don't change the account's login or profile details.</p>
    `),
  });
}

export async function sendRenewalReminder(
  email: string,
  accountName: string,
  daysUntilExpiry: number,
  autoRenew: boolean
) {
  const urgency =
    daysUntilExpiry <= 1 ? "Final Warning" : daysUntilExpiry <= 3 ? "Reminder" : "Upcoming Renewal";

  return sendEmail({
    to: email,
    subject: `${urgency}: Your rental of "${accountName}" ${
      autoRenew ? "will auto-renew" : "expires"
    } in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? "s" : ""}`,
    html: `
      <h2>${urgency}</h2>
      <p>Your rental of <strong>${accountName}</strong> ${
      autoRenew
        ? `will automatically renew in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? "s" : ""}.`
        : `expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? "s" : ""}. Auto-renew is OFF.`
    }</p>
      ${
        !autoRenew
          ? `<p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Enable auto-renew</a> to keep your access.</p>`
          : ""
      }
      <p>— LinkedIn Ambassadors Team</p>
    `,
  });
}

export async function sendRenewalConfirmation(email: string, accountName: string) {
  return sendEmail({
    to: email,
    subject: `Renewal confirmed: "${accountName}"`,
    html: `
      <h2>Renewal Successful</h2>
      <p>Your rental of <strong>${accountName}</strong> has been renewed for another month.</p>
      <p>— LinkedIn Ambassadors Team</p>
    `,
  });
}

export async function sendPaymentFailedEmail(email: string, accountName: string) {
  return sendEmail({
    to: email,
    subject: `Payment failed for "${accountName}" — action required`,
    html: `
      <h2>Payment Failed</h2>
      <p>We couldn't process payment for your rental of <strong>${accountName}</strong>.</p>
      <p>Please <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">update your payment method</a> to avoid losing access.</p>
      <p>— LinkedIn Ambassadors Team</p>
    `,
  });
}

export async function sendAccessRevokedEmail(email: string, accountName: string) {
  return sendEmail({
    to: email,
    subject: `Access revoked: "${accountName}"`,
    html: `
      <h2>Access Revoked</h2>
      <p>Your rental of <strong>${accountName}</strong> has ended. Access has been revoked.</p>
      <p>Browse our <a href="${process.env.NEXT_PUBLIC_APP_URL}/catalogue">catalogue</a> to rent another account.</p>
      <p>— LinkedIn Ambassadors Team</p>
    `,
  });
}

export async function sendAmbassadorWelcomeEmail(
  email: string,
  fullName: string,
  tempPassword: string,
  monthlyAmount: number
) {
  return sendEmail({
    to: email,
    subject: "Welcome to LinkedIn Ambassadors — Your account is ready",
    html: `
      <h2>Welcome, ${fullName}!</h2>
      <p>You're now a LinkedIn Ambassador. Your account has been set up and is ready to go.</p>

      <h3>Your Login Details</h3>
      <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
        <p style="margin:4px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin:4px 0;"><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
        <p style="margin:8px 0 0;font-size:13px;color:#666;">You can change your password after logging in.</p>
      </div>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Log In to Your Dashboard</a></p>

      <h3>What Happens Next</h3>
      <ul>
        <li><strong>Monthly payments of $${monthlyAmount}</strong> will be sent to your bank account on the 1st of each month while your account is active.</li>
        <li><strong>Keep your LinkedIn session active.</strong> If your account gets logged out, we'll contact you to re-authenticate. Payments are paused until access is restored.</li>
        <li><strong>Cancel anytime</strong> with 30 days notice.</li>
      </ul>

      <p>Questions? Reply to this email or contact us at support@linkedvelocity.com</p>
      <p>— The LinkedIn Ambassadors Team</p>
    `,
  });
}

export async function sendAmbassadorApplicationLead(application: {
  fullName: string;
  email: string;
  linkedinEmail?: string | null;
  contactNumber?: string | null;
  linkedinUrl: string;
  connectionCount?: number | null;
  industry?: string | null;
  location?: string | null;
  notes?: string | null;
  status?: string;
  offeredAmount?: number | string | null;
}) {
  const row = (label: string, value: string | number | null | undefined) =>
    value === null || value === undefined || value === ""
      ? ""
      : `<tr><td style="padding:6px 12px;color:#536471;font-size:13px;white-space:nowrap;">${label}</td><td style="padding:6px 12px;color:#0F1419;font-size:13px;">${value}</td></tr>`;

  return sendEmail({
    to: "info@linkedvelocity.com",
    subject: `New ambassador application: ${application.fullName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 20px;">
        <h2 style="color:#0F1419;margin-bottom:8px;">New Ambassador Application</h2>
        <p style="color:#536471;font-size:14px;margin-bottom:20px;">Someone just submitted the "Get Your Profile Valuation" form.</p>
        <table style="width:100%;border-collapse:collapse;background:#F8F8F5;border-radius:12px;overflow:hidden;">
          ${row("Name", application.fullName)}
          ${row("Email", application.email)}
          ${row("LinkedIn Email", application.linkedinEmail)}
          ${row("Contact", application.contactNumber)}
          ${row("LinkedIn URL", `<a href="${application.linkedinUrl}" style="color:#0A66C2;">${application.linkedinUrl}</a>`)}
          ${row("Connections", application.connectionCount)}
          ${row("Industry", application.industry)}
          ${row("Location", application.location)}
          ${row("Status", application.status)}
          ${row("Offered Amount", application.offeredAmount ? `$${application.offeredAmount}/mo` : null)}
          ${row("Notes", application.notes)}
        </table>
      </div>
    `,
  });
}

export async function sendTelegramMessageNotification(opts: {
  fromName: string;
  username?: string | null;
  chatId: number | string;
  text: string;
}) {
  const userHandle = opts.username ? `@${opts.username}` : "(no username)";
  const replyLink = opts.username
    ? `https://t.me/${opts.username}`
    : `tg://user?id=${opts.chatId}`;
  const escaped = opts.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return sendEmail({
    to: ["info@linkedvelocity.com", "sam@ortusclub.com", "ardi@linkedvelocity.com"],
    subject: `New Telegram message from ${opts.fromName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 20px;">
        <h2 style="color:#0F1419;margin-bottom:8px;">New Telegram Message</h2>
        <p style="color:#536471;font-size:14px;margin-bottom:20px;">${opts.fromName} ${userHandle} just messaged the LinkedVelocity support bot.</p>
        <div style="background:#F8F8F5;border-radius:12px;padding:18px 20px;margin-bottom:16px;">
          <p style="margin:0 0 6px;color:#536471;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">Message</p>
          <p style="margin:0;color:#0F1419;font-size:15px;line-height:1.5;white-space:pre-wrap;">${escaped}</p>
        </div>
        <p style="margin:0;color:#536471;font-size:13px;">
          <a href="${replyLink}" style="color:#0A66C2;text-decoration:none;">Reply on Telegram →</a>
        </p>
      </div>
    `,
  });
}

export async function sendSignupNotification(user: {
  fullName: string;
  email: string;
  contactNumber?: string | null;
}) {
  return sendEmail({
    to: "info@linkedvelocity.com",
    subject: `New LinkedVelocity signup: ${user.fullName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
        <h2 style="color:#0F1419;margin-bottom:8px;">New Signup</h2>
        <p style="color:#536471;font-size:14px;margin-bottom:20px;">A new user just created a LinkedVelocity account.</p>
        <div style="background:#F8F8F5;border-radius:12px;padding:18px 20px;">
          <p style="margin:0 0 8px;color:#0F1419;font-size:14px;"><strong>Name:</strong> ${user.fullName}</p>
          <p style="margin:0 0 8px;color:#0F1419;font-size:14px;"><strong>Email:</strong> <a href="mailto:${user.email}" style="color:#0A66C2;text-decoration:none;">${user.email}</a></p>
          ${user.contactNumber ? `<p style="margin:0;color:#0F1419;font-size:14px;"><strong>Contact:</strong> ${user.contactNumber}</p>` : ""}
        </div>
      </div>
    `,
  });
}

export async function sendTestAccountLead(name: string, email: string) {
  return sendEmail({
    to: "info@linkedvelocity.com",
    subject: `New test-account lead: ${name}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
        <h2 style="color:#0F1419;margin-bottom:8px;">New Test Account Lead</h2>
        <p style="color:#536471;font-size:14px;margin-bottom:20px;">Someone just opened the test LinkedIn account from linkedvelocity.com.</p>
        <div style="background:#F8F8F5;border-radius:12px;padding:18px 20px;">
          <p style="margin:0 0 8px;color:#0F1419;font-size:14px;"><strong>Name:</strong> ${name}</p>
          <p style="margin:0;color:#0F1419;font-size:14px;"><strong>Email:</strong> <a href="mailto:${email}" style="color:#0A66C2;text-decoration:none;">${email}</a></p>
        </div>
      </div>
    `,
  });
}

export async function sendTopUpNotification(opts: {
  customerEmail: string;
  customerName?: string | null;
  amount: number | string;
  method: "card" | "crypto";
}) {
  const amountStr = Number(opts.amount).toFixed(2);
  const methodLabel = opts.method === "card" ? "Card (Stripe)" : "Crypto (USDC on Base)";
  return sendEmail({
    to: adminEmail,
    subject: `💰 New top-up: $${amountStr} (${opts.method})`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
        <h2 style="color:#0F1419;margin-bottom:8px;">New Balance Top-Up</h2>
        <p style="color:#536471;font-size:14px;margin-bottom:20px;">A customer just added funds to their LinkedVelocity balance.</p>
        <div style="background:#F8F8F5;border-radius:12px;padding:18px 20px;">
          <p style="margin:0 0 8px;color:#0F1419;font-size:14px;"><strong>Amount:</strong> $${amountStr} USDC</p>
          <p style="margin:0 0 8px;color:#0F1419;font-size:14px;"><strong>Method:</strong> ${methodLabel}</p>
          ${opts.customerName ? `<p style="margin:0 0 8px;color:#0F1419;font-size:14px;"><strong>Customer:</strong> ${opts.customerName}</p>` : ""}
          <p style="margin:0;color:#0F1419;font-size:14px;"><strong>Email:</strong> <a href="mailto:${opts.customerEmail}" style="color:#0A66C2;text-decoration:none;">${opts.customerEmail}</a></p>
        </div>
      </div>
    `,
  });
}

export async function sendRentalNotification(opts: {
  customerEmail: string;
  customerName?: string | null;
  accountName: string;
}) {
  return sendEmail({
    to: adminEmail,
    subject: `🎉 New rental: ${opts.accountName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
        <h2 style="color:#0F1419;margin-bottom:8px;">New Account Rental</h2>
        <p style="color:#536471;font-size:14px;margin-bottom:20px;">A customer just rented a LinkedIn account.</p>
        <div style="background:#F8F8F5;border-radius:12px;padding:18px 20px;">
          <p style="margin:0 0 8px;color:#0F1419;font-size:14px;"><strong>Account:</strong> ${opts.accountName}</p>
          ${opts.customerName ? `<p style="margin:0 0 8px;color:#0F1419;font-size:14px;"><strong>Customer:</strong> ${opts.customerName}</p>` : ""}
          <p style="margin:0;color:#0F1419;font-size:14px;"><strong>Email:</strong> <a href="mailto:${opts.customerEmail}" style="color:#0A66C2;text-decoration:none;">${opts.customerEmail}</a></p>
        </div>
      </div>
    `,
  });
}

export async function sendAccountAvailableEmail(email: string, accountName: string) {
  return sendEmail({
    to: email,
    subject: `"${accountName}" is now available!`,
    html: `
      <h2>Account Available</h2>
      <p>The LinkedIn account <strong>${accountName}</strong> you were interested in is now available for rent.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/catalogue">Rent it now</a> before someone else does!</p>
      <p>— LinkedIn Ambassadors Team</p>
    `,
  });
}
