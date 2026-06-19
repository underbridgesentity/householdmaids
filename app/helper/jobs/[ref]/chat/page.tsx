import { redirect } from "next/navigation";

/** Helper messaging is now a single support thread with Household Maids. */
export default async function LegacyHelperChatRedirect() {
  redirect("/helper/messages");
}
