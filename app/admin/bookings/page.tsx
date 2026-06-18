import { ComingSoon } from "@/components/admin/ComingSoon";

export const dynamic = "force-dynamic";

export default function AdminBookingsPage() {
  return (
    <ComingSoon
      title="Bookings"
      subtitle="Every booking, filterable and actionable"
      blurb="A full bookings console — filter by status and payment, assign or reassign a cleaner, and cancel with a wallet refund — is coming in a later phase of the rebuild."
    />
  );
}
