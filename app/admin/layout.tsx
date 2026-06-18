import { requireRole } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Gate the entire admin surface. Customers/helpers are redirected to their home.
  const user = await requireRole("ADMIN");
  return (
    <AdminShell userName={user.name ?? "Admin"} userEmail={user.email ?? undefined}>
      {children}
    </AdminShell>
  );
}
