import Link from "next/link";

export const metadata = {
  title: "Ambassador Agreement — LinkedVelocity",
  description: "LinkedIn Account Access & Usage Agreement for LinkedVelocity ambassadors.",
};

// Fees are denominated in PHP in the underlying agreement (Clause 5) and shown here
// in their USD equivalent at the current benchmark (~₱60 = $1). The PHP figure governs.
const FEES = {
  initial: { usd: "$16", php: "1,000 PHP" },
  monthly: { usd: "$8", php: "500 PHP" },
  referral: { usd: "$8", php: "500 PHP" },
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
          This Agreement is between you (the &ldquo;Ambassador&rdquo;) and LinkedVelocity (the &ldquo;Company&rdquo;).
          It sets out the terms on which you share access to a LinkedIn account with the Company for B2B sales
          outreach, what the Company pays you, and the control you keep over the account. Fees below are shown
          in their US-dollar equivalent; the underlying amounts are set in Philippine pesos (PHP) and may be paid
          in any currency you prefer (see Clause&nbsp;5).
        </p>
      </div>

      {/* Fee summary — the headline numbers, up top for clarity */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-green-100 bg-green-50/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Month 1 (one-time)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{FEES.initial.usd}</p>
          <p className="text-xs text-gray-500">≈ {FEES.initial.php} · after the account is confirmed stable</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Each month after</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{FEES.monthly.usd}</p>
          <p className="text-xs text-gray-500">≈ {FEES.monthly.php} · paid on the 1st</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Referral fee</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{FEES.referral.usd}</p>
          <p className="text-xs text-gray-500">≈ {FEES.referral.php} · one-time, per onboarded referral</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        These are default/floor rates. We may pay more for more mature accounts or accounts that meet
        specific criteria, and the price will never go below these defaults.
      </p>

      <Clause id="acceptance" title="1. Acceptance of Terms">
        <p>1.1 This Agreement takes effect on a deemed-acceptance basis. By sharing or providing access to an Account to the Company, the Ambassador is deemed to have read, understood, and agreed to all the terms of this Agreement, whether or not it has been formally signed.</p>
        <p>1.2 The act of handing over access to the Account constitutes acceptance of the default fees and terms set out below, unless the Parties have agreed different terms in writing beforehand.</p>
      </Clause>

      <Clause id="grant" title="2. Purpose &amp; Grant of Access">
        <p>2.1 The Ambassador agrees to provide the Company with access to a LinkedIn account, being either the Ambassador&apos;s own personal LinkedIn account, or the account of a family member, friend, or acquaintance which the Ambassador is duly authorised to provide (the &ldquo;Account&rdquo;), for the sole purpose of business-to-business (&ldquo;B2B&rdquo;) sales outreach campaigns.</p>
        <p>2.2 Where the Account belongs to a person other than the Ambassador, the Ambassador warrants that they have obtained that person&apos;s full and informed consent to provide access to the Account on the terms of this Agreement, and that the account holder agrees to be bound by it. The Ambassador shall remain the Company&apos;s primary point of contact and shall be responsible for the conduct and obligations of the account holder under this Agreement.</p>
        <p>2.3 The Account will only be used for professional B2B outreach and legitimate business research. This includes, but is not limited to: (a) sending connection requests; (b) sending direct messages and outbound outreach; (c) using the Account to introduce connections to relevant persons within the account holder&apos;s network; and (d) general business and internet research. The Account will never be used for anything illegal or harmful. That is a firm promise.</p>
        <p>2.4 The Company may from time to time update certain variables on the Account profile to present a professional business profile. This may include the headline, About section, job title, role, work experience, and location/region, and essentially everything except the account holder&apos;s name. The Company may also update the profile picture to a clean, professional version (for example, an AI-enhanced photo) while keeping it recognisably the same person. The Company shall not change the account holder&apos;s name.</p>
      </Clause>

      <Clause id="security" title="3. Account Access &amp; Security">
        <p>3.1 The Account shall remain mutually accessible to both Parties at all times.</p>
        <p>3.2 To maintain the security and stability of the Account, the Company will access and operate the Account using a secure anti-detect browser/login program (such as GoLogin or equivalent). This ensures that LinkedIn does not flag the Account as being accessed from multiple locations or devices, thereby reducing the risk of verification checks, restriction, or suspension, and helping to keep the Account safe.</p>
        <p>3.3 <strong>Email.</strong> The Company will set its own email address as the primary email on the Account, so that LinkedIn security and verification codes are received by the Company. This is what allows the Company to keep the Account logged in and stable, and to restore access quickly when LinkedIn periodically logs accounts out as a matter of routine policy. The account holder&apos;s own email is retained on the Account as a secondary email.</p>
        <p>3.4 <strong>Password.</strong> The Company will not ordinarily change the Account password. This means the Ambassador (or account holder) keeps their login and retains access to the Account at all times, and can reclaim it at any point.</p>
        <p>3.5 The Ambassador is entitled to reclaim sole control of the Account and/or terminate this Agreement at any time, without prior warning or notice, subject to the payment terms in Clause 5.</p>
        <p>3.6 <strong>Your access is guaranteed at all times.</strong> Occasionally, for the Account&apos;s own protection, for example if LinkedIn flags a possible compromise or a security issue requires it, the Company may need to change the password. If that happens, the Company will promptly share the new password (and details of any related change) with the Ambassador, so that the Ambassador never loses access to the Account.</p>
        <p>3.7 <strong>We never receive your ID.</strong> The Company never receives or holds the Ambassador&apos;s personal identification. Where LinkedIn requires identity verification, the account holder completes this themselves. The only thing the Company ever has access to is the LinkedIn Account itself, never the Ambassador&apos;s ID or identity documents.</p>
      </Clause>

      <Clause id="restrictions" title="4. Keeping the Account Safe &amp; Restrictions">
        <p>4.1 <strong>Restrictions can happen, and that is normal.</strong> LinkedIn may place a temporary restriction or verification check on any account. The risk is higher while an account is new or being warmed up, and higher still for an account that has not completed identity verification. We strongly recommend verifying the account with a passport, as this lowers the risk. Please note that identity verification reduces the risk but does not remove it: even a verified account can still be restricted.</p>
        <p>4.2 <strong>Restrictions are usually recoverable.</strong> Most restrictions are temporary and straightforward to resolve, often with a quick verification step (for example, scanning a QR code). We will simply ask for the account holder&apos;s quick help to verify and recover the Account when needed. In rare cases a restriction may be permanent and the Account cannot be recovered.</p>
        <p>4.3 <strong>We cannot always know why.</strong> LinkedIn does not always explain why a restriction happens, so it is not always possible to identify the cause. What matters most is keeping the Account safe.</p>
        <p>4.4 <strong>Please do not actively use the Account while it is with us.</strong> The Ambassador keeps full access to the Account at all times. However, the best way to keep the Account safe is to leave the day-to-day use to the Company while the arrangement is running. You are welcome to log in to check on the Account, but please avoid actively using it (for example posting, messaging, connecting, or browsing) from your own device or location. Accessing the Account from a different device or location at the same time raises the risk of a restriction. In short: you keep access, we simply ask that you do not actively use it while it is with us, so that it stays safe.</p>
      </Clause>

      <Clause id="fees" title="5. Fees &amp; Payment">
        <p>5.1 <strong>Default Fees.</strong> Unless otherwise agreed in writing, the default fees for each Account are: (a) <strong>Month 1 (Initial Payment): {FEES.initial.usd}</strong> (≈ {FEES.initial.php}), paid once the Account is confirmed stable (approximately 3 days after handover, or approximately 1 week for a brand-new account); and (b) <strong>Each month thereafter (Monthly Fee): {FEES.monthly.usd}</strong> (≈ {FEES.monthly.php}).</p>
        <p>5.2 <strong>Currency.</strong> Fees may be paid in PHP or the equivalent amount in any currency the Ambassador prefers, calculated at the prevailing exchange rate at the time of payment.</p>
        <p>5.3 <strong>Default Pricing &amp; Floor.</strong> The above are the assumed prices and apply unless a different figure is stipulated in writing. The Company occasionally pays more for more mature accounts, or for accounts that meet criteria the Company is specifically looking for. The price will never go lower than the default fees set out above.</p>
        <p>5.4 <strong>Monthly Payment Date.</strong> The Monthly Fee is a payment for a full calendar month. The Initial Payment covers the Ambassador from the date of handover to the end of the first full calendar month following handover. Thereafter, the {FEES.monthly.php} Monthly Fee falls due on the 1st day of each subsequent calendar month, for as long as the Account remains active and accessible. This avoids paying a full monthly fee for only a few days where access is handed over close to the end of a month.</p>
        <p>5.5 <strong>Payment Method.</strong> All payments shall be made via a method of the Ambassador&apos;s choosing, including bank transfer, GCash, PayPal, or other widely-used payment platforms.</p>
      </Clause>

      <Clause id="availability" title="6. Staying in Contact, Availability &amp; Retainer">
        <p>6.1 <strong>Ongoing contact.</strong> The Ambassador agrees to remain contactable by the Company throughout the arrangement, via a phone number or messaging channel of their choosing. Staying reachable allows the Company to verify details and resolve any issue on the Account quickly, which is what keeps the Account safe.</p>
        <p>6.2 <strong>The Monthly Fee as a retainer.</strong> The {FEES.monthly.php} Monthly Fee also serves as a retainer for the Ambassador&apos;s ongoing availability and cooperation, for example promptly completing any verification check LinkedIn may request. This is what allows the Company to keep the Account secure and to restore it quickly if access is ever interrupted.</p>
        <p>6.3 <strong>Suspension of payment.</strong> The Company&apos;s obligation to pay the Monthly Fee is conditional on the Account remaining active and accessible. The Company shall not be obliged to make any further Monthly Fee payment for any period in which: (a) LinkedIn has imposed a verification check or other restriction that prevents normal use of the Account; or (b) the Ambassador has changed the login credentials such that the Company can no longer access the Account.</p>
        <p>6.4 <strong>Restoring access.</strong> Where access is interrupted, the Company will contact the Ambassador via their chosen contact number or channel to request that the Ambassador complete any required verification check or restore access. Once access is restored, payment of the Monthly Fee shall resume.</p>
      </Clause>

      <Clause id="partnership" title="7. Working Together, Vetting &amp; Risk">
        <p>7.1 <strong>A two-way partnership.</strong> This is intended as a long-term, good-faith partnership. The Company works to keep the Account safe, and the Ambassador is free, and encouraged, to report anything they notice on the Account at any time. The Company is on the Ambassador&apos;s side and will act on anything raised.</p>
        <p>7.2 <strong>Vetting.</strong> The Company does its best to vet the businesses it partners with, and only permits legitimate B2B professional outreach on the Account.</p>
        <p>7.3 <strong>Good faith &amp; risk.</strong> Even with careful vetting, lending an account carries an inherent risk that cannot be fully guaranteed against. In the rare event a renter misuses the Account, the Company acts in good faith to prevent and remedy this, but is not liable for a renter&apos;s misuse; the Ambassador acknowledges this as part of the ordinary risk of lending an account. The Ambassador&apos;s ultimate protection is their own control: they retain access at all times and can pause or reclaim the Account whenever they wish (Clauses 3.1, 3.4 to 3.6).</p>
      </Clause>

      <Clause id="benefits" title="8. Benefits to the Ambassador">
        <p>8.1 In addition to the fees set out above, the Ambassador will benefit from the maturing and growth of the Account, including the building of connections with high-level executives, thereby enhancing the value and reach of the account holder&apos;s professional network.</p>
      </Clause>

      <Clause id="referrals" title="9. Additional Accounts &amp; Referral Fee">
        <p>9.1 <strong>Additional accounts.</strong> The Company is willing to pay for additional accounts should the Ambassador wish to bring them, whether the Ambassador&apos;s own account, or that of a family member, friend, or acquaintance provided with that person&apos;s full and informed consent (see Clause 2.2). Each additional account earns its own default Initial Payment and Monthly Fee on the same terms as this Agreement.</p>
        <p>9.2 <strong>Referral fee.</strong> Where the Ambassador refers a third party who provides their own account, and the Initial Payment and Monthly Fee for that account are paid directly to the referred person, the Ambassador shall additionally receive a one-time referral fee of <strong>{FEES.referral.usd}</strong> (≈ {FEES.referral.php}) for each successfully onboarded referral.</p>
        <p>9.3 The referral fee is paid once per referral, and only after that referral has been successfully onboarded and verified. It is the assumed amount unless a different figure is stipulated in writing, and will never go lower than this amount.</p>
      </Clause>

      <Clause id="general" title="10. General">
        <p>10.1 <strong>Independent Parties.</strong> Nothing in this Agreement creates a partnership, employment, or agency relationship between the Parties.</p>
        <p>10.2 <strong>Variation.</strong> Any change to the default fees or terms is only valid if agreed in writing between the Parties (which includes messaging via the Parties&apos; usual communication channel, such as WhatsApp).</p>
        <p>10.3 <strong>Entire Agreement.</strong> This Agreement constitutes the entire agreement between the Parties relating to its subject matter and supersedes any prior discussions or arrangements.</p>
      </Clause>

      <div className="mt-12 rounded-xl border border-gray-200 bg-gray-50 p-5 text-[15px] leading-relaxed text-gray-600">
        <strong className="text-gray-900">Acceptance:</strong> By sharing access to an Account, or by ticking
        &ldquo;I have read and agree&rdquo; where this Agreement is presented digitally, the Ambassador confirms
        agreement to these terms. A signature is optional and for record-keeping only.
      </div>

      <div className="mt-8 text-center">
        <Link href="/become-ambassador" className="text-sm font-medium text-green-700 hover:text-green-800">
          ← Back to the Ambassador programme
        </Link>
      </div>
    </div>
  );
}
