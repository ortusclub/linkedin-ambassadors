import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submittedApplicationsWhere } from "@/lib/application-ownership";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function ResumeOnboarding({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSession();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/onboarding/resume/${id}`)}`);
  if (user.status !== "active") notFound();
  const application = await prisma.ambassadorApplication.findFirst({
    where: { id, ...submittedApplicationsWhere(user) },
    select: { selfServiceOnboarding: { select: { publicToken: true } } },
  });
  const token = application?.selfServiceOnboarding?.publicToken;
  if (!token) notFound();
  redirect(`/onboarding/setup/${encodeURIComponent(token)}`);
}
