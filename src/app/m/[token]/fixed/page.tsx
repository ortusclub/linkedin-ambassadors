import FixedConfirm from "./fixed-confirm";

export const metadata = { title: "Marked as fixed · LinkedVelocity" };

export default async function FixedPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ app?: string }>;
}) {
  const { token } = await params;
  const { app } = await searchParams;
  return <FixedConfirm token={token} app={app || ""} />;
}
