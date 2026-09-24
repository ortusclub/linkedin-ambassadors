import SelfServiceWizard from "../../../m/[token]/onboarding/wizard";

export const metadata = {
  title: "Set up your account · LinkedVelocity",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

// The DIY ambassador's own onboarding wizard, driven by their per-session token via the
// /api/self-onboarding mirror (selfMode). Reuses the exact wizard the referral flow uses.
export default async function SelfSetupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SelfServiceWizard token={token} endpoint={`/api/self-onboarding/${encodeURIComponent(token)}`} selfMode />;
}
