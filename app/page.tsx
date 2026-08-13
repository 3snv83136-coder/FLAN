import { redirect } from "next/navigation";
import { createClientReadOnly } from "@/lib/supabase/server";
import { LandingHero } from "@/components/home/landing-hero";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createClientReadOnly();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (profile?.is_active && profile.role) {
      redirect("/equipe");
    }
  }

  return <LandingHero />;
}
