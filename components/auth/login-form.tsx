"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginAs, loginWithCaissePin, type LoginCandidate } from "@/app/auth/actions";

const ROLE_LABEL: Record<string, string> = {
  vendeur: "Vendeur",
  producteur: "Pâtissier",
  gerant: "Gérant",
};

const DEVICE_POS_KEY = "flan_device_pos_id";

export function LoginForm({
  candidates,
  pointsOfSale,
}: {
  candidates: LoginCandidate[];
  pointsOfSale: { id: string; name: string; photo_url?: string | null }[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"caisse" | "equipe">("caisse");
  const [posId, setPosId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const equipe = candidates.filter((c) => c.role !== "vendeur");

  useEffect(() => {
    const saved = localStorage.getItem(DEVICE_POS_KEY);
    if (saved) setPosId(saved);
    else if (pointsOfSale[0]) setPosId(pointsOfSale[0].id);
  }, [pointsOfSale]);

  async function goHome() {
    router.replace("/equipe");
    router.refresh();
  }

  async function onPinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!posId) {
      setError("Choisis le magasin de cette tablette.");
      return;
    }
    if (!/^[0-9]{4,6}$/.test(pin)) {
      setError("Tape ton code caisse (4 à 6 chiffres).");
      return;
    }
    setPending(true);
    try {
      localStorage.setItem(DEVICE_POS_KEY, posId);
      const result = await loginWithCaissePin(pin, posId);
      if (result && "error" in result && result.error) {
        setError(result.error);
        setPin("");
        return;
      }
      await goHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
      setPin("");
    } finally {
      setPending(false);
    }
  }

  async function onPick(userId: string) {
    setError(null);
    setPending(true);
    try {
      const result = await loginAs(userId);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      await goHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setPending(false);
    }
  }

  function addDigit(d: string) {
    setPin((p) => (p.length >= 6 ? p : p + d));
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("caisse")}
          className={`min-h-12 rounded-xl text-sm font-semibold ${
            mode === "caisse" ? "bg-container-jaune text-brun" : "bg-white/15 text-white"
          }`}
        >
          Caisse
        </button>
        <button
          type="button"
          onClick={() => setMode("equipe")}
          className={`min-h-12 rounded-xl text-sm font-semibold ${
            mode === "equipe" ? "bg-container-jaune text-brun" : "bg-white/15 text-white"
          }`}
        >
          Équipe
        </button>
      </div>

      {mode === "caisse" ? (
        <form onSubmit={(e) => void onPinSubmit(e)} className="flex flex-col gap-3">
          <p className="text-center text-sm text-gris">
            Magasin de la tablette + code caisse
          </p>
          <div className="grid grid-cols-2 gap-2">
            {pointsOfSale.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPosId(p.id)}
                className={`overflow-hidden rounded-xl text-left ${
                  posId === p.id
                    ? "ring-2 ring-container-jaune"
                    : "ring-1 ring-white/20"
                }`}
              >
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.photo_url}
                    alt=""
                    className="h-20 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 items-center justify-center bg-white/10 text-xs text-gris">
                    Pas de photo
                  </div>
                )}
                <span
                  className={`block px-2 py-2 text-sm font-semibold ${
                    posId === p.id
                      ? "bg-container-jaune text-brun"
                      : "bg-white/15 text-white"
                  }`}
                >
                  {p.name}
                </span>
              </button>
            ))}
          </div>
          <p className="text-center font-display text-3xl tracking-[0.4em] text-container-jaune">
            {pin.length ? "•".repeat(pin.length) : "····"}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"].map(
              (key) => (
                <button
                  key={key}
                  type={key === "OK" ? "submit" : "button"}
                  disabled={pending}
                  onClick={() => {
                    if (key === "⌫") setPin((p) => p.slice(0, -1));
                    else if (key !== "OK") addDigit(key);
                  }}
                  className="min-h-14 rounded-xl bg-caramel text-xl font-semibold text-creme disabled:opacity-50"
                >
                  {key === "OK" && pending ? "…" : key}
                </button>
              ),
            )}
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm text-gris">
            Gérant / pâtissier — tape ton nom
          </p>
          {equipe.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={pending}
              onClick={() => void onPick(c.id)}
              className="flex min-h-16 items-center justify-between rounded-xl bg-caramel px-5 text-left text-creme disabled:opacity-60"
            >
              <span className="font-display text-xl font-semibold">
                {c.full_name}
              </span>
              <span className="text-sm text-creme/80">
                {ROLE_LABEL[c.role] ?? c.role}
              </span>
            </button>
          ))}
        </div>
      )}

      {error ? (
        <p className="rounded-xl bg-alerte/10 px-3 py-2 text-sm text-alerte" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
