export const ACCOUNT_SUPPORT_BOOKING_URL = "https://calendly.com/linkedvelocity-info/30min";
export const ISSUE_KEYS = ["restricted", "lost_access", "email_code", "password_changed", "email_removed", "two_factor", "other"] as const;
export type AccountIssue = typeof ISSUE_KEYS[number];
export const ACCOUNT_ISSUES: Record<AccountIssue, { label: string; problem: string; steps: string }> = {
  restricted: { label: "Restricted by LinkedIn", problem: "LinkedIn has restricted the account.", steps: "1. Sign in through LinkedIn's official app or website.\n2. Follow the recovery or identity-verification instructions LinkedIn displays.\n3. Reply once the restriction is cleared, or tell us what message LinkedIn displays if you need help." },
  lost_access: { label: "Lost access to the account", problem: "Our team can no longer access the account.", steps: "1. Check whether you can sign in to LinkedIn.\n2. Let us know whether any login, email, or security settings have changed.\n3. Reply so we can arrange the next steps to restore our access." },
  email_code: { label: "Verification email / code not arriving", problem: "The verification email or code needed to access the account is not arriving.", steps: "1. Check the account's email addresses in LinkedIn Settings & Privacy → Sign in & security.\n2. Confirm that the LinkedVelocity email address is still added and verified.\n3. Check spam/junk folders for verification emails and tell us which address LinkedIn is sending them to.\n4. Reply with what you find so we can restore access." },
  password_changed: { label: "Password changed or not working", problem: "The saved password no longer works, so our team cannot sign in.", steps: "1. Check that you can sign in and whether your password was recently changed.\n2. If necessary, use LinkedIn's official password-reset process.\n3. Reply to arrange a secure update of the login details with our team." },
  email_removed: { label: "LinkedVelocity email removed / not primary", problem: "The LinkedVelocity email address is missing or is no longer the primary email on the account.", steps: "1. Open LinkedIn Settings & Privacy → Sign in & security → Email addresses.\n2. Check that the LinkedVelocity email address is listed and verified. If it is missing or unverified, open the email setup guide below, verify your personal email, and follow the steps to re-add and confirm your assigned LV address.\n3. Set the confirmed LinkedVelocity email as primary and let us know when it is done." },
  two_factor: { label: "Two-factor authentication issue", problem: "The account's two-factor authentication is preventing our team from signing in.", steps: "1. Check whether you can sign in using your authenticator or LinkedIn's official recovery process.\n2. Tell us whether the authenticator or two-factor settings recently changed.\n3. Reply so we can coordinate a secure update and verify access together." },
  other: { label: "Other", problem: "There is an issue with the account that needs to be resolved.", steps: "Please address the issue described above and reply when it is resolved, or let us know what help you need." },
};
export function accountIssueMessage(name: string, recipient: "ambassador" | "referrer", issue: AccountIssue, details: string, profile?: string | null, referralPartner?: string | null, emails?: { original?: string | null; lv?: string | null; twoFactorReceivedAt?: string | null }) {
  const partner = referralPartner?.trim();
  const isReferrer = recipient === "referrer";
  const intro = isReferrer
    ? `You provided us with ${name}'s LinkedIn account through a referral. We can no longer access it. Can you please help us restore access? ${name}, as the account owner, will need to look into the account.`
    : `We received your LinkedIn account through a referral${partner ? ` from ${partner}` : " through our referral programme"}. We can no longer access your account. As the account owner, we need your help to restore access.`;
  const template = ACCOUNT_ISSUES[issue];
  const identifiers = issue === "restricted"
    ? `\nOriginal account email: ${emails?.original?.trim() || "Not recorded"}\nLinkedVelocity login email: ${emails?.lv?.trim() || "Not assigned"}`
    : profile ? `\nLinkedIn account: ${profile}` : "";
  const accessChecks = `\n\nComplete ALL of these checks before replying:\n1. The LinkedVelocity email should be ${emails?.lv?.trim() || "confirmed with our team (no LV email is recorded yet)"}. Check that this exact address is added, verified, and set as PRIMARY. Keep your original email as a secondary address.\nEmail setup guide: https://linkedvelocity.com/guide/primary-email\n2. Check that two-step verification is enabled and working with your authenticator app. ${emails?.twoFactorReceivedAt ? `We last received or updated the setup key on ${new Date(emails.twoFactorReceivedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}.` : "We do not have a recorded date for when the current setup key was provided."}\n- If 2FA is not set up or is switched off, follow the guide below to set it up, then send us the new 2FA setup key.\n- If you think the key has changed since we last received it, follow the guide to set up 2FA again, then send us the new setup key.\n- In either case, send the new setup key by replying to this email or through your usual communication channel with the LinkedVelocity team. Send the setup key, not the temporary six-digit code.\n- If 2FA is already enabled and the key has not changed since we last received it, confirm this when you reply.\n2FA setup guide: https://linkedvelocity.com/guide/two-step-verification`;
  const paymentNotice = isReferrer
    ? `Monthly LinkedVelocity payments to ${name}, the account owner, are suspended until the issue is resolved and our team confirms access has been restored.`
    : "As the account owner, your monthly LinkedVelocity payments are suspended until the issue is resolved and our team confirms access has been restored.";
  const completedAction = issue === "restricted" ? "cleared the LinkedIn restriction" : "checked that the LinkedVelocity primary email and the 2FA setup key are correct";
  const reply = isReferrer
    ? `Once ${name} has ${completedAction}, please reply to this email or message us through your usual communication channel. Our team will test whether we can access ${name}'s account again. Once we confirm access has been restored, ${name} will start receiving monthly LinkedVelocity payments again.`
    : `Once you have ${completedAction}, reply to this email or message us through your usual communication channel. Our team will test whether we can access your account again. Once we confirm access has been restored, you will start receiving monthly LinkedVelocity payments again.`;
  const optionOne = isReferrer
    ? `Option 1: Ask the account owner to check and resolve it\nPlease share the following instructions with ${name}. These steps are for the account owner to follow:\n\nInstructions for ${name}:`
    : "Option 1: Check and resolve it yourself";
  return { subject: "Monthly LinkedVelocity Payments Suspended", text: [
    `Hi${isReferrer ? partner ? ` ${partner}` : "" : ` ${name}`},`,
    `${intro}${identifiers}`,
    `${template.problem}${issue === "other" ? `\n\n${details.trim()}` : ""}`,
    paymentNotice,
    isReferrer ? `Please help ${name} restore access using either option below.` : "You can choose either of these options to restore access:",
    issue === "restricted"
      ? `${optionOne}\n1. Sign in using your original account email shown above and your existing password, if the email is still attached and the password has not changed. You can also use the LV email shown above if it is still attached.\n2. If LinkedIn asks for a two-step verification code, use your authenticator or open https://linkedvelocity.com/guide/restricted-account#sign-in-code. Verify your saved personal email there to get a current code for your own account.\n3. Follow LinkedIn’s restriction and identity-verification instructions. Our guide explains the steps: https://linkedvelocity.com/guide/restricted-account\n4. Once LinkedIn clears the restriction, reply so our team can check access. If you are stuck, tell us what LinkedIn displays or use Option 2 below.`
      : `${optionOne}\nFirst, make sure you can sign in to LinkedIn.${issue === "other" ? " Resolve the specific issue described above as well." : ""}${accessChecks}`,
    reply,
    `Option 2: Resolve it together on a call\n${isReferrer ? `Help ${name}, the account owner, book a meeting with our team so we can work through the issue together. You are welcome to join them.` : "Book a meeting with our team and we will work through the issue together."}\n${ACCOUNT_SUPPORT_BOOKING_URL}`,
    "Please do not send passwords or one-time codes by email. Reply if you need help.",
    "Thank you,\nThe LinkedVelocity team",
  ].join("\n\n") };
}
