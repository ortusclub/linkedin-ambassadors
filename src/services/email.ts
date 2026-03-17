import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const from = process.env.RESEND_FROM_EMAIL || "noreply@linkedinambassadors.com";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: EmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email] Would send to ${to}: ${subject}`);
    return;
  }
  return resend.emails.send({ from, to, subject, html });
}

export async function sendVerificationCode(email: string, code: string) {
  return sendEmail({
    to: email,
    subject: `Your Klabber verification code: ${code}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
        <h2 style="color:#2563eb;margin-bottom:8px;">Klabber</h2>
        <p style="color:#374151;font-size:15px;">Enter this code to sign in:</p>
        <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
          <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#111827;">${code}</span>
        </div>
        <p style="color:#6b7280;font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#6b7280;font-size:13px;margin-top:24px;">&mdash; The Klabber Team</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(
  email: string,
  accountName: string,
  accessInstructions: string
) {
  return sendEmail({
    to: email,
    subject: `Welcome! Your LinkedIn account "${accountName}" is ready`,
    html: `
      <h2>Your LinkedIn account rental is active!</h2>
      <p>You now have access to the LinkedIn account: <strong>${accountName}</strong></p>
      <h3>How to access your account:</h3>
      <p>${accessInstructions}</p>
      <p>Visit your <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">dashboard</a> to manage your rental.</p>
      <p>— LinkedIn Ambassadors Team</p>
    `,
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

      <p>Questions? Reply to this email or contact us at support@klabber.co</p>
      <p>— The LinkedIn Ambassadors Team</p>
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
