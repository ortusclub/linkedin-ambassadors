// Invites sent from the onboarded pipeline row: convert a just-onboarded ambassador
// into a referrer, and re-engage the referrer who brought them in. Offer tiers:
// refer = ₱500, onboard it yourself (DIY) = up to ₱1,000 per account.
// Referrers already have a live portal (/m/<token>); ambassadors don't yet, so they opt in.
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
    const subject = "A new way to earn on LinkedVelocity";
    if (channel === "chat") {
      const text = `${hi}, it's Ortus from LinkedVelocity. Thanks again for the accounts you've referred. We're still taking on new accounts, and there's a new way to earn more now: onboard an account yourself and you get up to ₱1,000 per account instead of ₱500.${portalUrl ? ` Your dashboard is still live here, your share link and the onboarding option are both inside: ${portalUrl}` : ""}`;
      return { subject, text };
    }
    const text = `${hi},\n\nThanks again for the accounts you've referred to us.\n\nWe're still accepting new accounts, so there's room to earn more whenever you're ready. And there's a new way to earn more per account: if you onboard an account yourself, you now earn up to ₱1,000 per account instead of ₱500.${portalUrl ? `\n\nYour referral dashboard is still live. Your share link and the new onboarding option are both inside:\n${portalUrl}` : ""}\n\nThank you,\nThe LinkedVelocity team`;
    return { subject, text };
  }
  // Ambassador: just onboarded, no portal yet — opt in to get one.
  const subject = "You can earn by referring now too";
  if (channel === "chat") {
    const text = `${hi}, it's Ortus from LinkedVelocity. Congrats on getting set up. You can earn by referring accounts now too: ₱500 per account, or up to ₱1,000 if you onboard them yourself. We're still accepting new accounts. Want me to set up your referral link?`;
    return { subject, text };
  }
  const text = `${hi},\n\nThanks for coming on board with LinkedVelocity, and congrats on getting set up.\n\nYou can now earn by referring accounts too. You get ₱500 per account, or up to ₱1,000 per account if you onboard them yourself. We're still accepting new accounts.\n\nReply and I'll set up your referral link.\n\nThank you,\nThe LinkedVelocity team`;
  return { subject, text };
}
