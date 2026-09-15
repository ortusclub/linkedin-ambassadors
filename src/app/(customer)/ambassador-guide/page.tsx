import Link from "next/link";

export const metadata = {
  title: "What to Expect With Your Account — LinkedVelocity",
  description: "A simple, plain-language summary of how your LinkedIn account is used and cared for while it's with LinkedVelocity.",
};

type Card = { icon: string; title: string; body: React.ReactNode; tone?: "green" | "amber" | "plain"; wide?: boolean };

// Plain-language "What to Expect" guide ambassadors and referrers can share before
// onboarding. Kept in sync with the ambassador terms; the terms are the binding version.
const CARDS: Card[] = [
  { icon: "✅", tone: "green", title: "Your name stays yours", body: <>We never change your name — it always stays matched to your real ID.</> },
  { icon: "📸", title: "A polished photo", body: <>We&apos;ll update your profile photo to a clean, professional-looking headshot.</> },
  { icon: "📝", wide: true, title: "Profile details are updated", body: <>Your headline, About section, job title, role, work experience — and essentially everything except your name — will be updated to present a professional business profile.</> },
  { icon: "🌐", title: "Region can be adjusted", body: <>Your location may be set to match the company&apos;s target region or market.</> },
  { icon: "📧", title: "We become the primary email", body: <>So LinkedIn&apos;s security &amp; verification prompts reach us — letting us keep your account safe and act fast.</> },
  { icon: "💼", wide: true, title: "How your account is used", body: <>Verified companies use it for professional <strong>outreach / outbound messaging</strong> and <strong>internet research</strong> only. It will <strong>never</strong> be used for anything illegal or harmful — that&apos;s a firm promise.</> },
  { icon: "⚠️", tone: "amber", wide: true, title: "Restrictions can happen — and that's normal", body: <>Especially while a new account is being warmed up or isn&apos;t verified yet, LinkedIn may temporarily restrict it. This is common and usually easy to fix — we&apos;ll simply ask for your quick help to verify and recover it (often just scanning a QR code). Nothing to worry about.</> },
  { icon: "🪪", title: "Your ID stays private", body: <>When verification is needed, <strong>you</strong> complete it yourself. We never receive or keep a copy of your ID.</> },
  { icon: "💰", tone: "green", title: "₱500 monthly retainer", body: <>A thank-you for staying with us and for your help whenever verification is needed — paid to you every month.</> },
];

function toneClasses(tone: Card["tone"]) {
  if (tone === "green") return "border-green-100 bg-green-50/60";
  if (tone === "amber") return "border-amber-200 bg-amber-50/70";
  return "border-gray-100 bg-white";
}

export default function AmbassadorGuidePage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <div className="border-b border-gray-100 pb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Ambassador Guide</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl" style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: "-0.03em" }}>
          What to Expect With Your Account
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
          A simple, plain-language summary of how your LinkedIn account is used and cared for while it&apos;s with us.
        </p>
        <div className="mt-5 h-1 w-16 rounded-full bg-green-500" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CARDS.map((c) => (
          <div key={c.title} className={`rounded-2xl border p-5 ${toneClasses(c.tone)} ${c.wide ? "sm:col-span-2" : ""}`}>
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="text-xl leading-none">{c.icon}</span>
              <div>
                <p className="font-bold text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>{c.title}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-gray-600">{c.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-gray-900 p-6 text-white sm:p-7">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="text-xl leading-none">🤝</span>
          <div>
            <p className="font-bold" style={{ fontFamily: "'Montserrat', sans-serif" }}>Happy with all of the above?</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-gray-300">
              If you agree with everything here, just let us know — and we&apos;ll get you onboarded. We&apos;re always here for any questions along the way.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-[13px] text-gray-500">
        Read the full <Link href="/ambassador-terms" className="font-semibold text-green-600 underline underline-offset-2">Ambassador Terms</Link>.
        {" "}LinkedVelocity · info@linkedvelocity.com · linkedvelocity.com
      </p>
    </div>
  );
}
