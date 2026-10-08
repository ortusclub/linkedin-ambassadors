// Invites sent from the onboarded pipeline row: convert a just-onboarded ambassador
// into a referrer, and re-engage the referrer who brought them in. Offer tiers:
// refer = ₱500, onboard it yourself (DIY) = up to ₱1,000 per account.
// Referrers already have a live portal (/m/<token>). Most new ambassadors don't yet, so
// they opt in — unless they're already a referrer (portalUrl passed), then we link it.
export type InviteRecipient = "ambassador" | "referrer";
export type InviteChannel = "email" | "chat";

export function referralInviteMessage(
  recipient: InviteRecipient,
  channel: InviteChannel,
  name: string,
  portalUrl?: string | null,
): { subject: string; text: string } {
  const hi = name?.trim() ? `Hi ${name.trim()}` : "Hi";

  if (recipient === "referrer") {
    const subject = "A bigger payout for your referrals";
    const link = portalUrl ? ` Your dashboard and share link are live here whenever you want to send someone over: ${portalUrl}` : "";
    if (channel === "chat") {
      return { subject, text: `${hi}, it's Ortus from LinkedVelocity. You've already sent accounts our way, thank you for that. Two things worth knowing: we're still taking on new accounts, and the payout is bigger now. Onboard an account yourself and you earn up to ₱1,000 for it, instead of ₱500 for a referral. Same process you already know, more for your time.${link}` };
    }
    const emailLink = portalUrl ? `\n\nYour dashboard and share link are live here:\n${portalUrl}` : "";
    return { subject, text: `${hi},\n\nThank you for the accounts you've sent our way. A couple of things you'll want to know.\n\nWe're still taking on new accounts, so the door's open whenever someone comes to mind. And the payout is bigger now: onboard an account yourself and you earn up to ₱1,000 for it, instead of ₱500 for a plain referral. Same process you already know, with more for your time.${emailLink}\n\nHappy to help if you have any questions.\nOrtus, LinkedVelocity` };
  }

  // Ambassador — just onboarded. If they're already a referrer (portalUrl), link it;
  // otherwise invite them to opt in and we set the portal up.
  const subject = "You can start earning on referrals now";
  if (portalUrl) {
    if (channel === "chat") {
      return { subject, text: `${hi}, it's Ortus from LinkedVelocity. Now that your account's up and running, you can start earning on the other side too. Refer someone and you get ₱500, or onboard an account yourself, exactly like you just did with yours, and earn up to ₱1,000 for it. You already have a referral dashboard, your share link and the onboarding option are both inside: ${portalUrl}` };
    }
    return { subject, text: `${hi},\n\nCongrats on getting set up. Now that you know how it all works, you can earn on referrals too.\n\nRefer someone and you earn ₱500. Or onboard an account yourself, exactly like you just did with yours, and earn up to ₱1,000 for it. Same steps you've already been through, so it's an easy way to earn on the side. We're still taking on new accounts.\n\nYour referral dashboard is live, your share link and the onboarding option are both inside:\n${portalUrl}\n\nOrtus, LinkedVelocity` };
  }
  if (channel === "chat") {
    return { subject, text: `${hi}, it's Ortus from LinkedVelocity. Now that your account's up and running, you can start earning on the other side too. Refer someone and you get ₱500, or onboard an account yourself, exactly like you just did with yours, and earn up to ₱1,000 for it. You already know the whole process, so it's an easy way to earn on the side. We're still taking on new accounts. Want me to set up your referral link?` };
  }
  return { subject, text: `${hi},\n\nCongrats on getting set up. Now that you know how it all works, you can earn on referrals too.\n\nRefer someone and you earn ₱500. Or onboard an account yourself, exactly like you just did with yours, and earn up to ₱1,000 for it. Same steps you've already been through, so it's an easy way to earn on the side. We're still taking on new accounts.\n\nReply here and I'll set up your referral link.\nOrtus, LinkedVelocity` };
}
