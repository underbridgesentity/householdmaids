import { redirect } from "next/navigation";

// Booking now lives at the public, guest-friendly /book route.
export default async function LegacyBookRedirect({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  redirect(service ? `/book?service=${service}` : "/book");
}
