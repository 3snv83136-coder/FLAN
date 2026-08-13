import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ContainerTone } from "@/components/ui/color-container";

const TONE_CLASS: Record<ContainerTone, string> = {
  jaune: "bg-container-jaune text-brun",
  vert: "bg-container-vert text-white",
  violet: "bg-container-violet text-white",
  rose: "bg-container-rose text-white",
  orange: "bg-container-orange text-white",
  cyan: "bg-container-cyan text-brun",
  blanc: "bg-white/95 text-brun",
};

export const EQUIPE_MODULES = [
  {
    href: "/vente",
    title: "Caisse",
    subtitle: "Ventes du jour, tablette, PIN",
    tone: "jaune" as const,
    mark: "01",
  },
  {
    href: "/agenda",
    title: "Équipe",
    subtitle: "Planning, qui est là, créneaux",
    tone: "violet" as const,
    mark: "02",
  },
  {
    href: "/rh",
    title: "RH",
    subtitle: "Contrats, dossiers, pointage",
    tone: "rose" as const,
    mark: "03",
  },
  {
    href: "/stock",
    title: "Stock",
    subtitle: "Flans en magasin, DLC, ruptures",
    tone: "cyan" as const,
    mark: "04",
  },
  {
    href: "/fabrication",
    title: "Production",
    subtitle: "Plan pâtissier, lots, recettes",
    tone: "orange" as const,
    mark: "05",
  },
  {
    href: "/statistique",
    title: "Statistique",
    subtitle: "CA, volumes, comparaisons",
    tone: "vert" as const,
    mark: "06",
  },
  {
    href: "/comptabilite",
    title: "Comptabilité",
    subtitle: "Encaissements, exports, clôture",
    tone: "blanc" as const,
    mark: "07",
  },
] as const;

export function EquipeHubGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {EQUIPE_MODULES.map((mod) => (
        <Link
          key={mod.href}
          href={mod.href}
          className={cn(
            "relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-3xl p-6 shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:shadow-xl",
            TONE_CLASS[mod.tone],
          )}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-8 font-display text-[7.5rem] leading-none opacity-15"
          >
            {mod.mark}
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-black/10"
          />
          <p className="relative text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
            Container
          </p>
          <div className="relative">
            <h2 className="font-display text-4xl font-semibold leading-none">
              {mod.title}
            </h2>
            <p className="mt-3 max-w-[16rem] text-sm leading-snug opacity-85">
              {mod.subtitle}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
