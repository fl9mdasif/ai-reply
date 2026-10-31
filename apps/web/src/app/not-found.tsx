// Paths outside any locale (rare: the middleware adds /bn) fall back to the Bangla homepage.
import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

export default function RootNotFound() {
  redirect(`/${routing.defaultLocale}`);
}
