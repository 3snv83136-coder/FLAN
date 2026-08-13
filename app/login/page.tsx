import { LoginForm } from "@/components/auth/login-form";
import { listLoginCandidates } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand/brand-logo";
import { createAdminClient } from "@/lib/supabase/admin";
import { sitePhotoUrl } from "@/lib/storage/site-photos";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const candidates = await listLoginCandidates();
  const admin = createAdminClient();
  const first = await admin
    .from("points_of_sale")
    .select("id, name, photo_path")
    .eq("is_active", true)
    .order("name");

  const fallback = first.error
    ? await admin
        .from("points_of_sale")
        .select("id, name")
        .eq("is_active", true)
        .order("name")
    : null;

  const rows = (first.data ?? fallback?.data ?? []) as {
    id: string;
    name: string;
    photo_path?: string | null;
  }[];

  const pointsOfSale = rows.map((p) => ({
    id: p.id,
    name: p.name,
    photo_url: sitePhotoUrl(p.photo_path ?? null),
  }));

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-10 flex flex-col items-center text-center">
        <BrandLogo size="lg" />
        <p className="mt-4 text-base text-gris">Connexion équipe</p>
      </div>
      <LoginForm candidates={candidates} pointsOfSale={pointsOfSale} />
    </main>
  );
}
