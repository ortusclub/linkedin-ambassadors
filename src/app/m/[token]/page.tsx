import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import Portal from "./Portal";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jak" });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-gro" });

export const metadata = { title: "Your Referral Dashboard · LinkedVelocity" };

export default async function MarketerPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className={`${jakarta.variable} ${grotesk.variable}`}>
      <Portal token={token} />
    </div>
  );
}
