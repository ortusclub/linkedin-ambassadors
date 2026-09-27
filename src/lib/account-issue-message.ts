export function accountIssueMessage(name: string, recipient: "ambassador" | "referrer", issue: "lost_access" | "restricted", details: string, profile?: string | null) {
  const account = recipient === "ambassador" ? "your LinkedIn account" : `${name}'s LinkedIn account, which you referred to LinkedVelocity`;
  const problem = issue === "restricted" ? "is restricted" : "is currently inaccessible to our team";
  return { subject: "Monthly LinkedVelocity Payments Suspended", text:
    `Hi${recipient === "ambassador" ? ` ${name}` : ""},\n\n${account[0].toUpperCase() + account.slice(1)} ${problem}.${profile ? `\nAccount: ${profile}` : ""}\n\nMonthly LinkedVelocity payments for this account are suspended until the issue is resolved and our team confirms access has been restored.\n\n${details ? `Issue details and required action:\n${details}\n\n` : ""}` +
    (recipient === "referrer" ? `Please contact ${name} and help them complete these steps:\n` : "Please complete these steps:\n") +
    (issue === "restricted" ? "1. Sign in through LinkedIn's official app or website and follow any recovery or verification instructions shown.\n2. Let us know once the restriction has been cleared, or reply with the message LinkedIn displays if help is needed.\n" : "1. Check whether the account owner can sign in to LinkedIn.\n2. Check the account's email settings and whether verification emails arrive, including spam/junk folders. Let us know if the password or recovery details have changed.\n3. Reply when this is resolved so our team can check access again.\n") +
    "\nPlease do not send passwords or one-time codes by email. Reply if you need help with the next step. Payments will resume once the issue is rectified and access is confirmed.\n\nThank you,\nThe LinkedVelocity team" };
}
