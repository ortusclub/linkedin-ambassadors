import type { Metadata } from "next";
import type { ReactNode } from "react";

// Unlisted, noindex tutorial — reachable only via the direct link (not in any nav/sitemap,
// hidden from search). Shared with an account owner during onboarding to set up 2FA.
export const metadata: Metadata = {
  title: "Set up two-step verification · LinkedVelocity",
  robots: { index: false, follow: false },
};

// Screenshots are added once redacted (the raw ones contain a live 2FA secret key + the
// account email). Set `img` to a file under /public/images/guide/2fa/ to replace the slot.
type Step = { title: string; body: ReactNode; img?: string; alt?: string; img2?: string; alt2?: string; note?: ReactNode };

const IMG = "/images/guide/2fa";
const STEPS: Step[] = [
  { title: "Open the menu", body: <>On LinkedIn (on a computer), click your photo — <strong>Me</strong> — at the top right, then <strong>Settings &amp; Privacy</strong>.</>, img: `${IMG}/step-1.png`, alt: "The Me menu with Settings & Privacy" },
  { title: "Go to Sign in & security", body: <>In the left-hand menu, click <strong>Sign in &amp; security</strong>.</>, img: `${IMG}/step-2.png`, alt: "Settings left menu, Sign in & security" },
  { title: "Open Two-factor authentication", body: <>Under <strong>Account access</strong>, click <strong>Two-factor authentication</strong> (it will say <em>Off</em>).</>, img: `${IMG}/step-3.png`, alt: "Account access list, Two-factor authentication Off" },
  { title: "Click Set up", body: <>On the two-factor authentication screen, click the blue <strong>Set up</strong> button.</>, img: `${IMG}/step-4.png`, alt: "Two-factor authentication intro with Set up button" },
  { title: "Confirm it's you", body: <>LinkedIn emails a <strong>6-digit code</strong> to the account&apos;s email. Open that inbox, enter the code, and click <strong>Submit</strong>.</>, img: `${IMG}/step-5.png`, alt: "Enter the emailed 6-digit code" },
  { title: "Choose Authenticator App", body: <>Under <strong>Choose your authentication method</strong>, select <strong>Authenticator App</strong>, then <strong>Continue</strong>.</>, img: `${IMG}/step-6.png`, alt: "Authentication method set to Authenticator App" },
  { title: "Enter your password", body: <>When the <strong>Enter Password</strong> box appears, type the LinkedIn password and click <strong>Submit</strong>.</>, img: `${IMG}/step-7.png`, alt: "Enter Password prompt" },
  {
    title: "Copy the setup key",
    body: <>LinkedIn shows a QR code and a <strong>setup key</strong> underneath (blurred here for privacy — yours will show clearly). It&apos;s a long string of letters and numbers — it looks like <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[13px] text-gray-800">JBSWY3DPEHPK3PXP</code>. Click the <strong>copy</strong> icon next to it. (Don&apos;t scan the QR — you just need the key.)</>,
    img: `${IMG}/step-8.png`, alt: "Authenticator setup screen with QR and key",
    note: <>This key is what lets LinkedVelocity keep the account signed in. <strong>Copy it into your LinkedVelocity portal&apos;s 2FA step</strong> (it shows the code for you), or send it to us.</>,
  },
  {
    title: "Get your 6-digit code",
    body: <>Turn that key into the 6-digit code LinkedIn is asking for. <strong>Easiest:</strong> paste the key into <strong>&ldquo;The 2FA setup key&rdquo;</strong> field in your LinkedVelocity portal (shown first below) — it shows the live code for you. <strong>Or</strong> go to <strong>2-fa.com/en</strong>, paste the key, and copy the 6-digit code it displays (blacked out below).</>,
    img: `${IMG}/step-9-portal.png`, alt: "The 2FA setup key field in the LinkedVelocity portal",
    img2: `${IMG}/step-9.png`, alt2: "2-fa.com showing the generated 6-digit code",
    note: <>The code refreshes every 30 seconds — grab a fresh one if it&apos;s about to change.</>,
  },
  { title: "Enter the code", body: <>Back on LinkedIn, paste the <strong>6-digit code</strong> into the box and click <strong>Confirm</strong>.</>, img: `${IMG}/step-10.png`, alt: "Enter the authenticator code and Confirm" },
  { title: "Done — 2FA is on", body: <>Two-factor authentication now shows <strong>On</strong>. That&apos;s it — the account is set up.</>, img: `${IMG}/step-11.png`, alt: "Two-factor authentication toggled On" },
];

export default function TwoStepVerificationGuide() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
      <div className="border-b border-gray-100 pb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Setup Guide</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl" style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: "-0.03em" }}>
          Set up two-step verification
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
          A quick walkthrough for turning on authenticator-app 2FA on your LinkedIn account, on a computer. Takes about 3 minutes.
        </p>
        <div className="mt-5 h-1 w-16 rounded-full bg-green-500" />
      </div>

      <ol className="mt-8 space-y-5">
        {STEPS.map((s, i) => (
          <li key={i} className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>{s.title}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-gray-600">{s.body}</p>
                {s.note && (
                  <p className="mt-2 rounded-xl border border-green-100 bg-green-50/60 px-3 py-2 text-[13px] leading-relaxed text-green-800">{s.note}</p>
                )}
                <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                  {s.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.img} alt={s.alt || s.title} className="block w-full" />
                  ) : (
                    <div className="flex aspect-[16/10] w-full items-center justify-center bg-gray-50 text-[12px] font-medium text-gray-400">
                      Screenshot
                    </div>
                  )}
                </div>
                {s.img2 && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.img2} alt={s.alt2 || s.title} className="block w-full" />
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-2xl bg-gray-900 p-6 text-white sm:p-7">
        <p className="font-bold" style={{ fontFamily: "'Montserrat', sans-serif" }}>Stuck on any step?</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-gray-300">
          Message the person who&apos;s onboarding you — they&apos;ll walk you through it. Nothing here changes your password, and you keep full access to your account.
        </p>
      </div>
    </div>
  );
}
