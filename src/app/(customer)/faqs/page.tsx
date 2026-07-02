import type { Metadata } from "next";
import { blogFontVars } from "@/lib/blog-fonts";
import FaqView, { type FaqGroup } from "./faq-view";

export const metadata: Metadata = {
  title: "FAQs — LinkedIn Account Rental Questions Answered",
  description:
    "Common questions about renting LinkedIn accounts on LinkedVelocity, and about earning as an ambassador — safety, pricing, payouts, and more.",
  alternates: { canonical: "/faqs" },
  openGraph: {
    title: "Frequently Asked Questions | LinkedVelocity",
    description:
      "Everything you need to know about renting LinkedIn accounts safely and earning as an ambassador.",
    url: "https://linkedvelocity.com/faqs",
  },
};

const FAQ_GROUPS: FaqGroup[] = [
  {
    label: "Getting started",
    color: "#0A66C2",
    items: [
      {
        q: "What is LinkedVelocity?",
        a: "A marketplace where growth teams rent verified, pre-warmed LinkedIn accounts for outreach — and professionals earn by sharing accounts they no longer actively use. Every account belongs to a consenting real person; we handle secure access, warm-up, and support.",
      },
      {
        q: "How does renting work?",
        a: "Browse the catalogue, rent a profile monthly, and open it in a secure anti-detect browser. You're running outreach from an established account in minutes — no warm-up period — while we manage the login layer and ongoing support.",
      },
      {
        q: "What tools can I use with a rented account?",
        a: "Any Chrome extension or LinkedIn automation tool — Dripify, Expandi, Linked Helper and others all work inside the browser session. Sales Navigator is available on accounts that include it. We recommend keeping activity within safe limits (roughly 100–200 actions a week), which we help you configure.",
      },
      {
        q: "How fast do I get access after renting?",
        a: "Typically within minutes. Once you've completed the quick one-time browser setup, we grant access to your rented account and you can start outreach straight away.",
      },
      {
        q: "Which regions are the accounts based in?",
        a: "We have accounts based across the US, UK, Canada, Australia and other regions. Browse the catalogue to filter by location, or tell us your target market and we'll match you to the best fit.",
      },
      {
        q: "Can I rent more than one account?",
        a: "Yes — rent as many as you need. Each is billed separately, and teams running higher volume often run several accounts at once.",
      },
    ],
  },
  {
    label: "Safety & compliance",
    color: "#0E7C74",
    items: [
      {
        q: "Will a rented account get restricted?",
        a: "Every session runs through an anti-detect browser with a dedicated proxy and isolated fingerprint, so LinkedIn sees one consistent user, and we enforce safe sending limits to protect the account. Accounts are actively monitored — and in the rare case one is restricted, we pause billing for it and move you to a replacement quickly, so your campaigns keep running.",
      },
      {
        q: "Is this compliant and safe for the account owner?",
        a: "Every account is shared with the owner's explicit, ongoing consent, and they can withdraw at any time. We secure access, mask credentials, and never expose the owner's password to renters.",
      },
      {
        q: "What sending limits should I stay within?",
        a: "We recommend keeping activity within safe limits — roughly 100–200 actions per week — to keep the account healthy. We'll help you configure your outreach tool to stay in range.",
      },
      {
        q: "What happens if an account is restricted mid-campaign?",
        a: "We pause billing for that account immediately, credit you for the downtime, and move you to a replacement so your outreach keeps running with minimal disruption.",
      },
    ],
  },
  {
    label: "Billing",
    color: "#946011",
    items: [
      {
        q: "How am I charged, and can I cancel?",
        a: "A flat monthly fee per account, paid by card (Stripe) or USDC. No contracts — cancel anytime and keep access through the end of your current billing period.",
      },
      {
        q: "What does an account cost?",
        a: "Pricing depends on the account's seniority, connections, and whether Sales Navigator is included. Most accounts fall between $75 and $125 per month, and you'll see the exact price before you commit.",
      },
      {
        q: "Can I set up auto-renew?",
        a: "Yes. You can switch on monthly auto-renew so your account continues without interruption, and turn it off anytime.",
      },
      {
        q: "What payment methods do you accept?",
        a: "Card via Stripe, or USDC (on Base). You'll choose at checkout.",
      },
      {
        q: "Is there a setup fee or minimum term?",
        a: "No setup fee and no minimum term — you pay a flat monthly fee per account and can cancel anytime.",
      },
    ],
  },
];

export default function FAQsPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_GROUPS.flatMap((g) =>
      g.items.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.a },
      }))
    ),
  };

  return (
    <div className={blogFontVars}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <FaqView groups={FAQ_GROUPS} />
    </div>
  );
}
