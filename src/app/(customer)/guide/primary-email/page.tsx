import type { Metadata } from "next";
import Image from "next/image";
export const metadata: Metadata = { title: "Set your primary LinkedIn email · LinkedVelocity", robots: { index: false, follow: false } };
export default function PrimaryEmailGuide() {
  return <main style={{ maxWidth: 760, margin: "40px auto", padding: 24, lineHeight: 1.7 }}>
    <h1>Set your LinkedVelocity email as primary</h1>
    <p>Use the exact LinkedVelocity email address provided in our message. Keep your original email on the account as a secondary address.</p>
    <ol>
      <li>Sign in to your LinkedIn account using the official app or website.</li>
      <li>Open <strong>Settings &amp; Privacy → Sign in &amp; security → Email addresses</strong>.</li>
      <li>Look for the LinkedVelocity email address. If it is missing, choose <strong>Add email address</strong> and enter the exact address our team provided.</li>
      <li>Follow LinkedIn’s verification instructions. Our team receives messages sent to the LV inbox; contact us to coordinate confirmation if needed.</li>
      <li>Once the address is verified, select <strong>Make primary</strong> beside the LinkedVelocity email and complete any confirmation LinkedIn requests.</li>
      <li>Check that the address now shows as primary. Reply to our team so we can verify that we have access again.</li>
    </ol>
    <Image src="/images/onboarding/linkedin-make-primary.png" alt="Make primary option next to an email address in LinkedIn" width={696} height={184} style={{ maxWidth: "100%", height: "auto" }} />
    <p>Also check <a href="/guide/two-step-verification">two-step verification using our setup guide</a>.</p>
    <p>If you cannot complete a step, <a href="https://calendly.com/linkedvelocity-info/30min">book a meeting</a> and we’ll resolve it together.</p>
  </main>;
}
