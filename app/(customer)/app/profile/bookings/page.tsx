import { redirect } from "next/navigation";

// Booking history now lives at /app/bookings (and is linked from the nav).
export default function LegacyBookingHistory() {
  redirect("/app/bookings");
}
