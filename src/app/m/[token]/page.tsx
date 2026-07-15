import Portal from "./Portal";

export const metadata = { title: "Your Referral Dashboard · LinkedVelocity" };

export default async function MarketerPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <Portal token={token} />;
}
