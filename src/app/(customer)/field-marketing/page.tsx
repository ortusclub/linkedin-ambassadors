import type { Metadata } from "next";
import { FieldMarketingForm } from "./field-marketing-form";

export const metadata: Metadata = {
  title: "Promo Team Role — Metro Manila | ₱2,000/day + Bonuses",
  description:
    "Join the LinkedVelocity promo team in Metro Manila. Earn ₱2,000/day plus transport and meals, with a ₱500 bonus for every sign-up and uncapped earning potential. Apply today.",
  alternates: { canonical: "/field-marketing" },
  openGraph: {
    title: "Promo Team Role — Metro Manila | ₱2,000/day + Bonuses",
    description:
      "Earn ₱2,000/day plus transport and meals, ₱500 per sign-up, uncapped earnings. On-the-ground promo work in Metro Manila malls. Apply now.",
    url: "https://linkedvelocity.com/field-marketing",
  },
};

const perks = [
  {
    title: "₱2,000 per day",
    desc: "Guaranteed base pay for every day you work.",
  },
  {
    title: "Flexible & on-call",
    desc: "Work around your own schedule — we let you know when there's a day on.",
  },
  {
    title: "₱500 per sign-up",
    desc: "A bonus for every person who successfully joins — uncapped.",
  },
  {
    title: "Uncapped earning potential",
    desc: "No ceiling — the more good sign-ups you bring in, the more you earn.",
  },
];

export default function FieldMarketingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Hero */}
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
            📍 Metro Manila · Now hiring
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Join Our Promo Team
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            A flexible, on-call role — hand out flyers and share your sign-up link to help
            people start earning from a LinkedIn account they already have. Base pay every day
            you work, plus an uncapped bonus for every person who joins.
          </p>
        </div>

        {/* Perks */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {perks.map((perk) => (
            <div
              key={perk.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-gray-900">{perk.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{perk.desc}</p>
            </div>
          ))}
        </div>

        {/* Role details */}
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900">About the role</h2>
          <ul className="mt-4 space-y-3 text-gray-700">
            <li className="flex gap-3">
              <span className="text-blue-600">•</span>
              <span>Hand out flyers and share your personal sign-up link in the right spots around Metro Manila.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-600">•</span>
              <span>Help people start earning passive income from a LinkedIn account they already have.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-600">•</span>
              <span>Every sign-up is tracked to you automatically — earn ₱500 for each person who joins.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-600">•</span>
              <span>Friendly, outgoing, and comfortable approaching people is all you need.</span>
            </li>
          </ul>
          <p className="mt-4 text-sm text-gray-500">
            We&apos;ll walk you through exactly how it works on a quick call.
          </p>
        </div>

        {/* Form */}
        <div id="apply" className="mt-8 scroll-mt-8">
          <FieldMarketingForm />
        </div>
      </div>
    </div>
  );
}
