import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import type { AppProfile } from "@/lib/sales/types";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/brand-logo";

type NavItem = { href: string; label: string };

const NAV: NavItem[] = [{ href: "/equipe", label: "Accueil" }];

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
  const items = NAV;

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-bleu-fonce/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <BrandLogo href="/equipe" size="sm" />
          <nav className="flex flex-wrap gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-medium",
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
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
