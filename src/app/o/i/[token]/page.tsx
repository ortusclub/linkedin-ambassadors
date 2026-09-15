import OwnerIntake from "../../[slug]/owner-intake";

export const metadata = {
  title: "Start your onboarding · LinkedVelocity",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default async function OwnerInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const base = `/api/onboard/invite/${encodeURIComponent(token)}`;
  return <OwnerIntake bootstrapUrl={base} submitUrl={base} />;
}
