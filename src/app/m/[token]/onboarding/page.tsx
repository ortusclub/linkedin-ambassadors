import SelfServiceWizard from "./wizard";

export const metadata = {
  title: "Do-it-yourself onboarding · LinkedVelocity",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default async function OnboardingPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ demo?: string }> }) {
  const { token } = await params;
  const { demo } = await searchParams;
  // `?demo=1` runs a safe, read-only preview: the whole wizard is clickable with
  // everything pre-filled and no server writes (see the demo guards in wizard.tsx).
  return <SelfServiceWizard token={token} demo={demo === "1"} />;
}
