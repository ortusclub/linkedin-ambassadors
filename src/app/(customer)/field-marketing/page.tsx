import type { Metadata } from "next";
import { FieldMarketingForm } from "./field-marketing-form";

export const metadata: Metadata = {
  title: "Field Marketing Role — Metro Manila | ₱2,000/day + Bonuses",
  description:
    "Join our field marketing team in Metro Manila. Earn ₱2,000/day plus transport and meals, with a ₱500 bonus for every sign-up and uncapped earning potential. Register your interest today.",
  alternates: { canonical: "/field-marketing" },
  openGraph: {
    title: "Field Marketing Role — Metro Manila | ₱2,000/day + Bonuses",
    description:
      "Earn ₱2,000/day plus transport and meals, ₱500 per sign-up, uncapped earnings. Field marketing in Metro Manila malls. Apply now.",
    url: "https://linkedvelocity.com/field-marketing",
  },
};

const perks = [
  {
    title: "₱2,000 per day",
    desc: "Guaranteed daily pay for your time on the ground.",
  },
  {
    title: "Transport & meals covered",
    desc: "We pay for your travel and food while you work — no out-of-pocket costs.",
  },
  {
    title: "₱500 per sign-up",
    desc: "Earn a ₱500 bonus for every single sign-up you bring in.",
  },
  {
    title: "Uncapped earning potential",
    desc: "There's no ceiling — the more sign-ups you drive, the more you earn.",
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
            Field Marketing Role
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Represent LinkedVelocity in malls across Metro Manila — handing out flyers and
            signing people up. Great pay, real bonuses, and no limit on what you can earn.
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
              <span>Work in shopping malls across the Metro Manila area.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-600">•</span>
              <span>Hand out flyers and talk to shoppers about LinkedVelocity.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-600">•</span>
              <span>Get people signed up — you earn ₱500 for each one.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-600">•</span>
              <span>Friendly, outgoing, and comfortable approaching people is all you need.</span>
            </li>
          </ul>
        </div>

        {/* Form */}
        <div id="apply" className="mt-8 scroll-mt-8">
          <FieldMarketingForm />
        </div>
      </div>
    </div>
  );
}
