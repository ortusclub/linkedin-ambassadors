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
