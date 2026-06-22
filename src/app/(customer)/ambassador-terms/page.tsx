import Link from "next/link";

export const metadata = {
  title: "Ambassador Agreement — LinkedVelocity",
  description: "LinkedIn Account Access & Usage Agreement for LinkedVelocity ambassadors.",
};

// Fees are denominated in PHP in the underlying agreement (Clause 4.2) and shown here
// in their USD equivalent at the current benchmark (~₱60 = $1). The PHP figure governs.
const FEES = {
  initial: { usd: "$16", php: "1,000 PHP" },
  monthly: { usd: "$8", php: "500 PHP" },
  referral: { usd: "$3", php: "150 PHP" },
};

function Clause({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10">
      <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: "-0.02em" }}>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-gray-600">{children}</div>
    </section>
  );
}

export default function AmbassadorTermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <div className="border-b border-gray-100 pb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-green-600">For Ambassadors</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl" style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: "-0.03em" }}>
          LinkedIn Account Access &amp; Usage Agreement
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
          This Agreement sets out the terms on which you (the &ldquo;Ambassador&rdquo;) share access to a
          LinkedIn account with LinkedVelocity (the &ldquo;Company&rdquo;) for B2B sales outreach, and how you
          are paid for it. Fees below are shown in their US-dollar equivalent; the underlying amounts are
          set in Philippine pesos (PHP) and may be paid in any currency you prefer (see Clause&nbsp;4).
        </p>
      </div>

      {/* Fee summary — the headline numbers, up top for clarity */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-green-100 bg-green-50/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Month 1 (one-time)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{FEES.initial.usd}</p>
          <p className="text-xs text-gray-500">≈ {FEES.initial.php} · on handover of access</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Each month after</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{FEES.monthly.usd}</p>
          <p className="text-xs text-gray-500">≈ {FEES.monthly.php} · paid on the 1st</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Referral fee</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{FEES.referral.usd}</p>
          <p className="text-xs text-gray-500">≈ {FEES.referral.php} · per referred account / month</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        These are default/floor rates. We may pay more for more mature accounts or accounts that meet
        specific criteria — and the price will never go below these defaults.
      </p>

      <Clause id="acceptance" title="1. Acceptance of Terms">
        <p>1.1 This Agreement takes effect on a deemed-acceptance basis. By sharing or providing access to an Account to the Company, the Ambassador is deemed to have read, understood, and agreed to all the terms of this Agreement, whether or not it has been formally signed.</p>
        <p>1.2 The act of handing over access to the Account constitutes acceptance of the default fees and terms set out below, unless the Parties have agreed different terms in writing beforehand.</p>
      </Clause>

      <Clause id="grant" title="2. Purpose &amp; Grant of Access">
        <p>2.1 The Ambassador agrees to provide the Company with access to a LinkedIn account — being either the Ambassador&apos;s own personal LinkedIn account, or the account of a family member, friend, or acquaintance which the Ambassador is duly authorised to provide (the &ldquo;Account&rdquo;) — for the sole purpose of business-to-business (&ldquo;B2B&rdquo;) sales outreach campaigns.</p>
        <p>2.2 Where the Account belongs to a person other than the Ambassador, the Ambassador warrants that they have obtained that person&apos;s full and informed consent to provide access to the Account on the terms of this Agreement, and that the account holder agrees to be bound by it. The Ambassador shall remain the Company&apos;s primary point of contact and shall be responsible for the conduct and obligations of the account holder under this Agreement.</p>
        <p>2.3 Such outreach will be carried out by the Company through activities including, but not limited to: (a) sending connection requests; (b) sending direct messages; and (c) using the Account to introduce connections to relevant persons within the account holder&apos;s network.</p>
        <p>2.4 The Company may from time to time amend certain variables on the Account profile, which may include the location, job experience/history, and profile picture. The Company shall not change the account holder&apos;s name without prior consent.</p>
      </Clause>

      <Clause id="security" title="3. Account Access &amp; Security">
        <p>3.1 The Account shall remain mutually accessible to both Parties at all times.</p>
        <p>3.2 To maintain the security and stability of the Account, the Company will access and operate the Account using a secure anti-detect browser/login program (such as GoLogin or equivalent). This ensures that LinkedIn does not flag the Account as being accessed from multiple locations or devices, thereby reducing the risk of verification checks, restriction, or suspension, and helping to keep the Account safe.</p>
        <p>3.3 Upon receiving access to the Account, the Company will not change the Account password and will not change the Account&apos;s primary email address. This ensures the Ambassador (or account holder) retains full access to the Account at all times and is able to reclaim it at any point.</p>
        <p>3.4 The Company will, however, add an additional/secondary email address to the Account. This is solely so that the Company can receive a verification code and regain access in the event the Account is logged out. LinkedIn periodically logs accounts out as a matter of routine policy, and this measure ensures access can be restored without disruption.</p>
        <p>3.5 The Ambassador is entitled to reclaim sole control of the Account and/or terminate this Agreement at any time, without prior warning or notice, subject to the payment terms in Clause 4.</p>
      </Clause>

      <Clause id="fees" title="4. Fees &amp; Payment">
        <p>4.1 <strong>Default Fees.</strong> Unless otherwise agreed in writing, the default fees for each Account are: (a) <strong>Month 1 (Initial Payment): {FEES.initial.usd}</strong> (≈ {FEES.initial.php}), payable immediately upon, and conditional on, the handover of access to the Account; and (b) <strong>Each month thereafter (Monthly Fee): {FEES.monthly.usd}</strong> (≈ {FEES.monthly.php}).</p>
        <p>4.2 <strong>Currency.</strong> Fees may be paid in PHP or the equivalent amount in any currency the Ambassador prefers, calculated at the prevailing exchange rate at the time of payment.</p>
        <p>4.3 <strong>Default Pricing &amp; Floor.</strong> The above are the assumed prices and apply unless a different figure is stipulated in writing. The Company occasionally pays more for more mature accounts, or for accounts that meet criteria the Company is specifically looking for. The price will never go lower than the default fees set out above.</p>
        <p>4.4 <strong>Monthly Payment Date.</strong> The Monthly Fee shall be paid on the 1st day of each month following the month in which access was handed over. For the avoidance of doubt, no Monthly Fee is due for the first calendar month, as that period is covered by the Initial Payment.</p>
        <p>4.5 <strong>Payment Method.</strong> All payments shall be made via a method of the Ambassador&apos;s choosing, including bank transfer, GCash, PayPal, or other widely-used payment platforms.</p>
      </Clause>

      <Clause id="availability" title="5. Account Availability &amp; Suspension of Payment">
        <p>5.1 The Company&apos;s obligation to pay the Monthly Fee is conditional on the Account remaining active and accessible to the Company.</p>
        <p>5.2 The Company shall not be obliged to make any further Monthly Fee payment for any period in which: (a) LinkedIn has imposed a verification check or other restriction that prevents normal use of the Account; or (b) the Ambassador has changed the login credentials such that the Company can no longer access the Account.</p>
        <p>5.3 Where access is interrupted, the Company will contact the Ambassador via their preferred communication channel (preferably WhatsApp) to request that the Ambassador complete any required verification check or restore access. Once access is restored, payment of the Monthly Fee shall resume.</p>
      </Clause>

      <Clause id="benefits" title="6. Benefits to the Ambassador">
        <p>6.1 In addition to the fees set out above, the Ambassador will benefit from the maturing and growth of the Account, including the building of connections with high-level executives, thereby enhancing the value and reach of the account holder&apos;s professional network.</p>
      </Clause>

      <Clause id="referrals" title="7. Additional Accounts &amp; Referral Fees">
        <p>7.1 The Company is willing to provide payment for additional accounts should the Ambassador wish to bring them. This may be arranged in either of the following ways: (a) <strong>Direct provision</strong> — where the Ambassador personally provides the additional account, the Company shall pay the Ambassador the default Initial Payment and Monthly Fee for that account on the same terms as this Agreement; or (b) <strong>Referral</strong> — where the Ambassador refers a third party who provides their own account, and the Initial Payment and Monthly Fee for that account are paid directly to the referred person, the Ambassador shall additionally receive a referral (or &ldquo;fetcher&rdquo;) fee.</p>
        <p>7.2 The default referral/fetcher fee is <strong>{FEES.referral.usd}</strong> (≈ {FEES.referral.php}) per referred account, per month (or equivalent currency), payable to the Ambassador for as long as the referred account remains active and accessible under this Agreement. This is the assumed price unless a different figure is stipulated in writing, and will never go lower than this amount.</p>
        <p>7.3 The referral/fetcher fee is not payable for the initial month. It becomes payable from the first full month following the initial month, and continues for each additional month thereafter for as long as the referred account remains active and accessible.</p>
      </Clause>

      <Clause id="general" title="8. General">
        <p>8.1 <strong>Independent Parties.</strong> Nothing in this Agreement creates a partnership, employment, or agency relationship between the Parties.</p>
        <p>8.2 <strong>Variation.</strong> Any change to the default fees or terms is only valid if agreed in writing between the Parties (which includes messaging via the Parties&apos; usual communication channel, such as WhatsApp).</p>
        <p>8.3 <strong>Entire Agreement.</strong> This Agreement constitutes the entire agreement between the Parties relating to its subject matter and supersedes any prior discussions or arrangements.</p>
      </Clause>

      <div className="mt-12 rounded-xl border border-gray-200 bg-gray-50 p-5 text-[15px] leading-relaxed text-gray-600">
        <strong className="text-gray-900">Acceptance:</strong> By sharing access to an Account, the Ambassador
        confirms agreement to these terms. A signature is optional and for record-keeping only.
      </div>

      <div className="mt-8 text-center">
        <Link href="/become-ambassador" className="text-sm font-medium text-green-700 hover:text-green-800">
          ← Back to the Ambassador programme
        </Link>
      </div>
    </div>
  );
}
