import SelfServiceWizard from "./wizard";

export const metadata = {
  title: "Do-it-yourself onboarding · LinkedVelocity",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default async function OnboardingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SelfServiceWizard token={token} />;
}
