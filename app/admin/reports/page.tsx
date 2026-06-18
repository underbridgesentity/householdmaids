import { ComingSoon } from "@/components/admin/ComingSoon";

export const dynamic = "force-dynamic";

export default function AdminReportsPage() {
  return (
    <ComingSoon
      title="Reports"
      subtitle="Sales, growth and wallet analytics"
      blurb="Sales over time, cash-vs-wallet revenue split, referral and helper performance, and one-click CSV export are coming in a later phase of the rebuild."
    />
  );
}
