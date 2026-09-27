export function includeIssueLoginDetails(text: string, email: string, password: string, codeLink: string, ownerName?: string) {
  const details = `Login email: ${email}\nSaved login password: ${password}\nSix-digit authenticator code: ${codeLink}\nOpen this private link and enter the login email above.`;
  const restrictedStep = /^1\. Sign in using your original account email shown above[^\n]*/m;
  if (restrictedStep.test(text)) return text.replace(restrictedStep, () => `1. Sign in to LinkedIn using these saved login details:\n${details}`);
  const accessStep = /^First, make sure you can sign in to LinkedIn\.[^\n]*/m;
  if (accessStep.test(text)) return text.replace(accessStep, line => `${line}\n${details}`);
  return `${text}\n\n${ownerName ? `Saved LinkedIn login details for ${ownerName}:` : "Your saved LinkedIn login details:"}\n${details}`;
}
