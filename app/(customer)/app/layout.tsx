import { requireRole } from "@/lib/rbac";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  // Gate the whole customer surface. Admins/helpers are redirected to their home.
  await requireRole("CUSTOMER");
  return children;
}
