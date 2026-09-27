export const ONBOARDING_ISSUES = {
  email_added: { label: "Email not added", action: "Open LinkedIn → Settings & Privacy → Sign in & security → Email addresses. Add the LinkedVelocity email shown below and complete verification." },
  email_primary: { label: "Email not primary", action: "Open LinkedIn → Settings & Privacy → Sign in & security → Email addresses. Set the verified LinkedVelocity email as primary. Keep the original email as a secondary address." },
  twofa: { label: "2FA not set up", action: "Follow https://linkedvelocity.com/guide/two-step-verification to set up authenticator-based two-step verification, then contact our team to complete the secure setup." },
  password: { label: "Password missing / wrong", action: "Check you can sign in to LinkedIn. If needed, reset the password using LinkedIn’s official recovery process, then contact our team to arrange a secure update." },
  restricted: { label: "Account restricted", action: "Open LinkedIn on your own phone and follow its identity-verification steps. See https://linkedvelocity.com/guide/restricted-account, then let our team know when the restriction is cleared." },
  other: { label: "Other", action: "" },
} as const;
export type OnboardingIssue = keyof typeof ONBOARDING_ISSUES;
export function onboardingIssueMessage(issue: OnboardingIssue, recipient: "ambassador" | "referrer", name: string, profile: string | null, lvEmail: string | null, details: string) {
  const item = ONBOARDING_ISSUES[issue];
  return { subject: `LinkedVelocity onboarding: ${item.label}`, text: `Hi,\n\nWe need help completing onboarding for ${name}${profile ? ` (${profile})` : ""}.\n\nIssue: ${item.label}\n${recipient === "referrer" ? `Please help ${name} complete these steps:\n` : ""}${issue === "other" ? details : item.action}\n\nLinkedVelocity email: ${lvEmail || "Please confirm the assigned email with our team."}\n\nReply when this is done, or let us know where you are stuck. We’ll check the account and continue onboarding.\n\nThank you,\nThe LinkedVelocity team` };
}
