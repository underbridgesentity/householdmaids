import { redirect } from "next/navigation";

/** Messaging is now a single support thread with Household Maids. */
export default async function LegacyChatRedirect() {
  redirect("/app/messages");
}
