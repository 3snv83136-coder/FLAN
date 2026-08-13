import { LoginForm } from "@/components/auth/login-form";
import { listLoginCandidates } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand/brand-logo";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const candidates = await listLoginCandidates();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-10 flex flex-col items-center text-center">
        <BrandLogo size="lg" />
        <p className="mt-4 text-base text-gris">Connexion équipe</p>
      </div>
      <LoginForm candidates={candidates} />
    </main>
  );
}
