"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ColorContainer } from "@/components/ui/color-container";

const BOUTIQUE_URL = "https://le-comptoir-du-flan.sumupstore.com/produits";

export function LandingHero() {
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) setArrived(true);
  }, []);

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-bleu-fonce">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/accueil-flans.jpg"
        alt="Tranches de flans du Comptoir"
        className="landing-approach pointer-events-none absolute left-1/2 top-1/2 h-full w-full max-w-none origin-center object-cover"
        onAnimationEnd={() => setArrived(true)}
      />

      <div
        className={`absolute inset-0 bg-gradient-to-t from-bleu-fonce/80 via-transparent to-bleu-fonce/20 transition-opacity duration-1000 ${
          arrived ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-5 px-6 pb-12 text-center transition-all duration-1000 ${
          arrived
            ? "translate-y-0 opacity-100"
            : "translate-y-6 opacity-0"
        }`}
      >
        <BrandLogo size="lg" />
        <p className="font-display text-3xl text-white sm:text-4xl">
          Le Comptoir du Flan
        </p>
        <ColorContainer
          tone="jaune"
          title="Vente en ligne"
          subtitle="Commande tes flans, on s’occupe du reste"
          className="w-full max-w-md text-left"
        >
          <a
            href={BOUTIQUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-14 items-center justify-center rounded-xl bg-brun text-lg font-semibold text-creme"
          >
            Commander
          </a>
        </ColorContainer>
        <Link
          href="/login"
          className="text-sm font-medium text-white/80 underline underline-offset-4"
        >
          Espace équipe
        </Link>
      </div>
    </main>
  );
}
