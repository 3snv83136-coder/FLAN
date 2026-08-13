import { LoginForm } from "@/components/auth/login-form";
import { listLoginCandidates } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const candidates = await listLoginCandidates();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-10 text-center">
        <p className="font-display text-5xl font-semibold tracking-tight text-caramel">
          FLAN
        </p>
        <p className="mt-2 text-base text-gris">Connexion équipe</p>
      </div>
      <LoginForm candidates={candidates} />
    </main>
  );
}
