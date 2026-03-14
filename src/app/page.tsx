import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Rent Premium LinkedIn Accounts
              <span className="text-blue-600"> Instantly</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              Browse our catalogue of pre-configured LinkedIn accounts with real connections,
              established histories, and Sales Navigator access. Pay monthly, cancel anytime.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/catalogue"
                className="rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Browse Available Accounts
              </Link>
              <a
                href="#how-it-works"
                className="rounded-lg border border-gray-300 bg-white px-8 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                How It Works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900">How It Works</h2>
          <p className="mt-4 text-center text-gray-600">Three simple steps to get started</p>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Browse",
                description:
                  "Explore our catalogue of premium LinkedIn accounts. Filter by industry, connections, location, and more.",
              },
              {
                step: "2",
                title: "Subscribe",
                description:
                  "Pick an account and subscribe for $50/month. Secure payment via Stripe. Cancel anytime.",
              },
              {
                step: "3",
                title: "Access",
                description:
                  "Get instant access to a fully configured browser profile with LinkedIn already logged in. Use it from any device.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-xl bg-white p-8 shadow-sm border border-gray-200">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                  {item.step}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-lg text-center">
            <h2 className="text-3xl font-bold text-gray-900">Simple Pricing</h2>
            <div className="mt-8 rounded-2xl border-2 border-blue-600 p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Per Account</p>
              <p className="mt-4">
                <span className="text-5xl font-bold text-gray-900">$50</span>
                <span className="text-gray-500">/month</span>
              </p>
              <ul className="mt-8 space-y-3 text-left text-gray-600">
                {[
                  "Fully configured browser profile",
                  "Residential proxy included",
                  "LinkedIn already logged in",
                  "Cancel anytime",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/catalogue"
                className="mt-8 block w-full rounded-lg bg-blue-600 py-3 text-center font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Browse Accounts
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
          <div className="mt-12 space-y-8">
            {[
              {
                q: "How does account access work?",
                a: "After subscribing, you'll receive access to a GoLogin browser profile. Download the free GoLogin app, and the shared profile will appear in your dashboard — LinkedIn is already logged in.",
              },
              {
                q: "Can I use the account from any device?",
                a: "Yes. The browser profile syncs your session, cookies, and fingerprint across devices. You can access it from any computer with GoLogin installed.",
              },
              {
                q: "What happens when my subscription ends?",
                a: "Your access to the browser profile is automatically revoked, and the account returns to our catalogue. You'll receive reminder emails before expiry.",
              },
              {
                q: "Is this safe for LinkedIn?",
                a: "Each account uses a unique browser fingerprint and dedicated residential proxy, making it indistinguishable from normal usage. Sessions persist naturally.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. Cancel from your dashboard at any time. You'll retain access until the end of your current billing period.",
              },
            ].map((faq) => (
              <div key={faq.q}>
                <h3 className="text-lg font-semibold text-gray-900">{faq.q}</h3>
                <p className="mt-2 text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} LinkedIn Ambassadors. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
