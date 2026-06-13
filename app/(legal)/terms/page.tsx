import { LegalShell, Section } from "../legal";

export const metadata = {
  title: "Terms of Service · Household Maids",
  description: "The terms governing your use of the Household Maids platform.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="13 June 2026">
      <p>
        These Terms govern your use of the Household Maids platform, operated by Mukhoni Cleaning Specialists (Pty) Ltd
        (&quot;Household Maids&quot;, &quot;we&quot;, &quot;us&quot;). By creating an account or booking a service you agree to these Terms.
      </p>

      <Section heading="1. The service">
        <p>Household Maids connects customers with vetted, independent cleaning professionals (&quot;helpers&quot;) across Gauteng. We facilitate bookings, payments and communication; helpers perform the cleaning services.</p>
      </Section>
      <Section heading="2. Accounts">
        <p>You must provide accurate information and keep your login credentials secure. You are responsible for activity under your account. You must be 18 or older to use the platform.</p>
      </Section>
      <Section heading="3. Bookings & pricing">
        <p>Prices are shown before you confirm a booking and are charged in South African Rand (ZAR). The total is calculated from the service, size/duration, add-ons and any applicable discounts. Recurring bookings repeat at the cadence you choose until cancelled.</p>
      </Section>
      <Section heading="4. Payments">
        <p>Payments are processed securely by Payfast. By paying you authorise the charge for your booking. A booking is confirmed once payment is received.</p>
      </Section>
      <Section heading="5. Referrals & wallet">
        <p>Referral rewards are earned only when a referred friend&apos;s first booking is paid in full. Rewards accrue to your in-app wallet and may be withdrawn to your bank account on the weekly payout cycle (requests by Thursday are paid the following Friday). We may adjust reward amounts and may withhold rewards we reasonably believe are obtained through fraud or abuse.</p>
      </Section>
      <Section heading="6. Helpers">
        <p>Helpers apply, consent to background checks and are vetted before joining. Helpers are independent contractors, not employees of Household Maids. We are not liable for the acts or omissions of helpers beyond what the law requires, but we take reasonable steps to vet and support our team.</p>
      </Section>
      <Section heading="7. Cancellations & refunds">
        <p>You may cancel a booking subject to our cancellation policy communicated at the time of booking. Refunds, where due, are returned to your original payment method or wallet.</p>
      </Section>
      <Section heading="8. Acceptable use">
        <p>Don&apos;t misuse the platform, attempt to circumvent payments, harass other users, or upload unlawful content. We may suspend or terminate accounts that breach these Terms.</p>
      </Section>
      <Section heading="9. Liability">
        <p>To the extent permitted by law, our liability is limited to the value of the affected booking. Nothing in these Terms excludes liability that cannot lawfully be excluded.</p>
      </Section>
      <Section heading="10. Changes">
        <p>We may update these Terms from time to time. Material changes will be notified in-app or by email. Continued use after changes means you accept them.</p>
      </Section>
      <p className="text-[13px] text-muted-soft">
        This document is a plain-language summary provided for transparency and is not a substitute for formal legal advice.
      </p>
    </LegalShell>
  );
}
