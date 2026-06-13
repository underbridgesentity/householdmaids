export type NavItem = {
  label: string;
  href: string;
  icon: string;
  exact?: boolean;
  also?: string[]; // extra path prefixes that should mark this item active
};

export const CUSTOMER_NAV: NavItem[] = [
  { label: "Home", href: "/app", icon: "🏠", exact: true },
  { label: "Book", href: "/book", icon: "🧹" },
  { label: "Wallet", href: "/app/wallet", icon: "💰", also: ["/app/withdraw", "/app/payouts"] },
  { label: "Messages", href: "/app/messages", icon: "💬" },
  { label: "Profile", href: "/app/profile", icon: "👤" },
];

export const HELPER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/helper/dashboard", icon: "🏠", also: ["/helper/jobs"] },
];

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  if (pathname === item.href || pathname.startsWith(item.href + "/")) return true;
  return (item.also ?? []).some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}
