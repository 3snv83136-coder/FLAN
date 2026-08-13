import { requireProfile } from "@/lib/auth/profile";
import { createClientReadOnly } from "@/lib/supabase/server";
import { ColorContainer } from "@/components/ui/color-container";

export const dynamic = "force-dynamic";

const TONES = ["jaune", "vert", "violet", "rose", "orange", "cyan"] as const;

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function AgendaPage() {
  const profile = await requireProfile();
  const supabase = createClientReadOnly();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("is_active", true)
    .order("full_name");

  const visibleProfiles =
    profile.role === "gerant"
      ? (profiles ?? [])
      : (profiles ?? []).filter((p) => p.id === profile.id);

  const profileIds = visibleProfiles.map((p) => p.id as string);

  const { data: items } = profileIds.length
    ? await supabase
        .from("agenda_items")
        .select("id, profile_id, title, notes, starts_at, ends_at")
        .in("profile_id", profileIds)
        .gte(
          "starts_at",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        )
        .order("starts_at")
    : { data: [] };

  const byProfile = new Map<string, typeof items>();
  for (const item of items ?? []) {
    const pid = item.profile_id as string;
    const list = byProfile.get(pid) ?? [];
    list.push(item);
    byProfile.set(pid, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl text-white">Agenda</h1>
        <p className="text-sm text-gris">
          {profile.role === "gerant"
            ? "Un container par salarié"
            : "Ton planning"}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleProfiles.map((p, index) => {
          const tone = TONES[index % TONES.length];
          const events = byProfile.get(p.id as string) ?? [];
          return (
            <ColorContainer
              key={p.id as string}
              tone={tone}
              title={p.full_name as string}
              subtitle={
                p.role === "producteur"
                  ? "Pâtissier"
                  : p.role === "gerant"
                    ? "Gérant"
                    : "Vendeur"
              }
            >
              {events.length === 0 ? (
                <p className="text-sm opacity-80">Rien de prévu pour l’instant.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {events.map((ev) => (
                    <li
                      key={ev.id as string}
                      className="rounded-xl bg-black/10 px-3 py-2"
                    >
                      <p className="font-semibold">{ev.title as string}</p>
                      <p className="text-sm opacity-80">
                        {formatWhen(ev.starts_at as string)}
                        {ev.ends_at
                          ? ` → ${formatWhen(ev.ends_at as string)}`
                          : ""}
                      </p>
                      {ev.notes ? (
                        <p className="mt-1 text-sm opacity-90">
                          {ev.notes as string}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </ColorContainer>
          );
        })}
      </div>
    </div>
  );
}
