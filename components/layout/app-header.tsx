import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import type { AppProfile } from "@/lib/sales/types";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

function navForRole(role: AppProfile["role"]): NavItem[] {
  if (role === "gerant") {
    return [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/agenda", label: "Agenda" },
      { href: "/fabrication", label: "Fabrication" },
      { href: "/vente", label: "Vente" },
      { href: "/stock", label: "Stock" },
    ];
  }
  if (role === "vendeur") {
    return [
      { href: "/vente", label: "Vente" },
      { href: "/stock", label: "Mon stock" },
      { href: "/agenda", label: "Agenda" },
    ];
  }
  return [
    { href: "/fabrication", label: "Fabrication" },
    { href: "/agenda", label: "Agenda" },
  ];
}

export function AppHeader({
  profile,
  pathname,
  pendingCount = 0,
  online = true,
}: {
  profile: AppProfile;
  pathname: string;
  pendingCount?: number;
  online?: boolean;
}) {
  const items = navForRole(profile.role);

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-bleu-fonce/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={items[0]?.href ?? "/"}
            className="font-display text-2xl font-semibold text-container-jaune"
          >
            FLAN
          </Link>
          <nav className="flex flex-wrap gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-medium",
                  pathname === item.href
                    ? "bg-container-jaune text-brun"
                    : "text-white/90 hover:bg-white/10",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {!online ? (
            <span className="rounded-lg bg-container-orange/90 px-2 py-1 text-xs font-medium text-white">
              Hors ligne
            </span>
          ) : null}
          {pendingCount > 0 ? (
            <span className="rounded-lg bg-container-jaune px-2 py-1 text-xs font-medium text-brun">
              {pendingCount} en file
            </span>
          ) : null}
          <span className="hidden text-sm text-gris sm:inline">
            {profile.full_name}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-xl border border-white/25 px-3 py-2 text-sm text-white hover:bg-white/10"
            >
              Quitter
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
