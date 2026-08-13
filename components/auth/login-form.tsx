"use client";

import { useState, useTransition } from "react";
import { loginAs, type LoginCandidate } from "@/app/auth/actions";

const ROLE_LABEL: Record<string, string> = {
  vendeur: "Vendeur",
  producteur: "Producteur",
  gerant: "Gérant",
};

export function LoginForm({ candidates }: { candidates: LoginCandidate[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onPick(userId: string) {
    setError(null);
    setPendingId(userId);
    startTransition(async () => {
      const result = await loginAs(userId);
      if (result?.error) {
        setError(result.error);
        setPendingId(null);
      }
    });
  }

  if (candidates.length === 0) {
    return (
      <p className="max-w-sm text-center text-sm text-gris">
        Aucun compte actif. Lance d’abord{" "}
        <code className="text-brun">npm run seed</code>.
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <p className="mb-2 text-center text-sm text-gris">
        Qui es-tu ? Tape ton nom pour te connecter.
      </p>

      {candidates.map((c) => {
        const loading = isPending && pendingId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            disabled={isPending}
            onClick={() => onPick(c.id)}
            className="flex min-h-16 items-center justify-between rounded-xl bg-caramel px-5 text-left text-creme transition hover:bg-caramel/90 disabled:opacity-60"
          >
            <span className="font-display text-xl font-semibold">
              {loading ? "Connexion…" : c.full_name}
            </span>
            <span className="text-sm text-creme/80">
              {ROLE_LABEL[c.role] ?? c.role}
            </span>
          </button>
        );
      })}

      {error ? (
        <p
          className="rounded-xl bg-alerte/10 px-3 py-2 text-sm text-alerte"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
