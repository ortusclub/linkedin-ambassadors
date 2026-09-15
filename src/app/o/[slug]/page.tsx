import OwnerIntake from "./owner-intake";

export const metadata = {
  title: "Start your onboarding · LinkedVelocity",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default async function OwnerOnboardingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const base = `/api/onboard/${encodeURIComponent(slug)}`;
  return <OwnerIntake bootstrapUrl={base} submitUrl={base} />;
}
