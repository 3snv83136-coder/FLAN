import { redirect } from "next/navigation";
import { homePathForRole, requireProfile } from "@/lib/auth/profile";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profile = await requireProfile();

  if (profile.role !== "producteur") {
    redirect(homePathForRole(profile.role));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <header>
        <p className="font-display text-4xl font-semibold text-caramel">FLAN</p>
        <h1 className="mt-3 text-2xl font-semibold text-brun">
          Salut {profile.full_name}
        </h1>
        <p className="mt-1 text-gris">Espace producteur</p>
      </header>

      <section className="rounded-2xl border border-gris/30 bg-white/70 p-6">
        <h2 className="font-display text-xl text-brun">Bientôt : recettes & lots</h2>
        <p className="mt-2 text-sm leading-relaxed text-gris">
          La Phase 1 (caisse) tourne pour les vendeurs. La production arrive en
          Phase 2.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/login" className="text-caramel underline">
            Changer de compte
          </Link>
        </p>
      </section>

      <form action={signOut}>
        <button
          type="submit"
          className="min-h-11 rounded-xl border border-gris/40 px-4 text-sm font-medium text-brun hover:bg-white"
        >
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
