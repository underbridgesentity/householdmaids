import { requireRole } from "@/lib/rbac";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminUnreadCount } from "@/lib/support";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Gate the entire admin surface. Customers/helpers are redirected to their home.
  const user = await requireRole("ADMIN");
  const supportUnread = await adminUnreadCount();
  return (
    <AdminShell userName={user.name ?? "Admin"} userEmail={user.email ?? undefined} supportUnread={supportUnread}>
      {children}
    </AdminShell>
  );
}
