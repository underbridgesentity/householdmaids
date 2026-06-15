import type { ComponentType } from "react";
import { Home, Sparkles, Wallet, MessageCircle, User } from "lucide-react";

export type IconType = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

export type NavItem = {
  label: string;
  href: string;
  icon: IconType;
  exact?: boolean;
  also?: string[]; // extra path prefixes that should mark this item active
};

export const CUSTOMER_NAV: NavItem[] = [
  { label: "Home", href: "/app", icon: Home, exact: true },
  { label: "Book", href: "/app/book", icon: Sparkles },
  { label: "Wallet", href: "/app/wallet", icon: Wallet, also: ["/app/withdraw", "/app/payouts"] },
  { label: "Messages", href: "/app/messages", icon: MessageCircle },
  { label: "Profile", href: "/app/profile", icon: User },
];

export const HELPER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/helper/dashboard", icon: Home, also: ["/helper/jobs"] },
];

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  if (pathname === item.href || pathname.startsWith(item.href + "/")) return true;
  return (item.also ?? []).some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}
