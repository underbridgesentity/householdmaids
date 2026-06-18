import { ComingSoon } from "@/components/admin/ComingSoon";

export const dynamic = "force-dynamic";

export default function AdminCustomersPage() {
  return (
    <ComingSoon
      title="Customers"
      subtitle="Search, segment and manage every customer"
      blurb="A searchable, paginated customer directory with per-customer detail — bookings, wallet balance, referrals and lifetime value — is coming next in the admin rebuild."
    />
  );
}
