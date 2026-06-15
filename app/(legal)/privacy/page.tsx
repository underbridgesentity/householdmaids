import { LegalShell, Section } from "../legal";

export const metadata = {
  title: "Privacy Policy · Household Maids",
  description: "How Household Maids collects, uses and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="13 June 2026">
      <p>
        Household Maids (operated by Mukhoni Cleaning Specialists (Pty) Ltd) respects your privacy and processes personal
        information in line with South Africa&apos;s Protection of Personal Information Act (POPIA).
      </p>

      <Section heading="Information we collect">
        <p>Account details (name, email, phone), booking details and addresses, payment confirmations from our payment provider, in-app messages, and, for helpers, ID number, a selfie, references, banking details and background-check consent.</p>
      </Section>
      <Section heading="How we use it">
        <p>To create and manage your account, match and fulfil bookings, process payments and payouts, run the referral programme, vet helpers, provide support, prevent fraud, and meet legal obligations.</p>
      </Section>
      <Section heading="How we protect it">
        <p>Passwords are hashed (Argon2id). Sensitive identifiers, ID numbers, banking details and uploaded helper documents, are encrypted at rest (AES-256-GCM) and only decrypted server-side when strictly needed. Traffic is served over HTTPS. Access to personal information is restricted on a least-privilege basis.</p>
      </Section>
      <Section heading="Sharing">
        <p>We share information only as needed to provide the service: the assigned helper sees the booking details required to do the job; payments go through Payfast; payouts go to your bank. We do not sell your personal information.</p>
      </Section>
      <Section heading="Retention">
        <p>We keep personal information for as long as your account is active or as needed to provide the service and comply with the law, then delete or anonymise it.</p>
      </Section>
      <Section heading="Your rights">
        <p>Under POPIA you may request access to, correction of, or deletion of your personal information, and may object to certain processing. Contact us to exercise these rights.</p>
      </Section>
      <Section heading="Contact">
        <p>For privacy queries, email info@householdmaids.co.za or call 062 032 4931.</p>
      </Section>
      <p className="text-[13px] text-muted-soft">
        This summary is provided for transparency and is not a substitute for formal legal advice or a full POPIA compliance programme.
      </p>
    </LegalShell>
  );
}
