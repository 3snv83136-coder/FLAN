import Link from "next/link";
import { requireProfile } from "@/lib/auth/profile";
import { EquipeHubGrid } from "@/components/equipe/hub-grid";

export const dynamic = "force-dynamic";

export default async function EquipeHubPage() {
  const profile = await requireProfile();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gris">
          Espace équipe
        </p>
        <h1 className="font-display text-4xl text-white">
          Bonjour {profile.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-gris">
          Choisis un container — on les remplira au fur et à mesure.
        </p>
      </header>

      <EquipeHubGrid />

      {profile.role === "gerant" ? (
        <p className="text-center text-sm text-gris">
          <Link href="/reglages" className="underline underline-offset-4">
            Photos & magasins
          </Link>
        </p>
      ) : null}
    </div>
  );
}
