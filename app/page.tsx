import { redirect } from "next/navigation";
import { homePathForRole, requireProfile } from "@/lib/auth/profile";

export const dynamic = "force-dynamic";

/** Redirige chaque rôle vers son écran principal. */
export default async function HomePage() {
  const profile = await requireProfile();
  redirect(homePathForRole(profile.role));
}
