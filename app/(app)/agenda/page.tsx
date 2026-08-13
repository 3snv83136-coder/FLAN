import { requireProfile } from "@/lib/auth/profile";
import { createClientReadOnly } from "@/lib/supabase/server";
import { ColorContainer } from "@/components/ui/color-container";
import { AddEmployeeForm } from "@/components/agenda/add-employee-form";
import {
  AgendaStaffContainer,
  type StaffCard,
} from "@/components/agenda/agenda-staff-container";

export const dynamic = "force-dynamic";

const TONES = [
  "bg-container-jaune text-brun",
  "bg-container-vert text-white",
  "bg-container-violet text-white",
  "bg-container-rose text-white",
  "bg-container-orange text-white",
  "bg-container-cyan text-brun",
] as const;

function parisWeekdayIso(date = new Date()) {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[wd] ?? 1;
}

function parisDayBounds() {
  const parisDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const start = new Date(`${parisDate}T00:00:00+02:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default async function AgendaPage() {
  const profile = await requireProfile();
  const supabase = createClientReadOnly();
  const canManage = profile.role === "gerant";
  const todayIso = parisWeekdayIso();
  const { start: dayStart, end: dayEnd } = parisDayBounds();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, contract_type, work_weekdays, is_active")
    .eq("is_active", true)
    .order("full_name");

  const visibleProfiles =
    canManage
      ? (profiles ?? [])
      : (profiles ?? []).filter((p) => p.id === profile.id);

  const profileIds = visibleProfiles.map((p) => p.id as string);

  const { data: items } = profileIds.length
    ? await supabase
        .from("agenda_items")
        .select("id, profile_id, title, notes, starts_at, ends_at")
        .in("profile_id", profileIds)
        .gte("starts_at", new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
        .order("starts_at")
    : { data: [] };

  const { data: docs } = profileIds.length
    ? await supabase
        .from("employee_documents")
        .select("id, profile_id, kind, file_path, original_name, created_at")
        .in("profile_id", profileIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const { data: clocks } = profileIds.length
    ? await supabase
        .from("time_clock_events")
        .select("id, profile_id, kind, clocked_at")
        .in("profile_id", profileIds)
        .gte("clocked_at", dayStart)
        .lt("clocked_at", dayEnd)
        .order("clocked_at", { ascending: false })
    : { data: [] };

  const eventsBy = new Map<string, StaffCard["events"]>();
  for (const ev of items ?? []) {
    const pid = ev.profile_id as string;
    const list = eventsBy.get(pid) ?? [];
    list.push({
      id: ev.id as string,
      title: ev.title as string,
      notes: (ev.notes as string | null) ?? null,
      starts_at: ev.starts_at as string,
      ends_at: (ev.ends_at as string | null) ?? null,
    });
    eventsBy.set(pid, list);
  }

  const docsBy = new Map<string, StaffCard["documents"]>();
  for (const d of docs ?? []) {
    const pid = d.profile_id as string;
    const list = docsBy.get(pid) ?? [];
    list.push({
      id: d.id as string,
      kind: d.kind as string,
      file_path: d.file_path as string,
      original_name: d.original_name as string,
      created_at: d.created_at as string,
    });
    docsBy.set(pid, list);
  }

  const clocksBy = new Map<string, StaffCard["clocksToday"]>();
  for (const c of clocks ?? []) {
    const pid = c.profile_id as string;
    const list = clocksBy.get(pid) ?? [];
    list.push({
      id: c.id as string,
      kind: c.kind as string,
      clocked_at: c.clocked_at as string,
    });
    clocksBy.set(pid, list);
  }

  const cards: StaffCard[] = visibleProfiles.map((p) => {
    const weekdays = (p.work_weekdays as number[] | null) ?? [1, 2, 3, 4, 5];
    return {
      id: p.id as string,
      full_name: p.full_name as string,
      role: p.role as string,
      contract_type: (p.contract_type as string | null) ?? null,
      work_weekdays: weekdays,
      events: eventsBy.get(p.id as string) ?? [],
      documents: docsBy.get(p.id as string) ?? [],
      clocksToday: clocksBy.get(p.id as string) ?? [],
      worksToday: weekdays.includes(todayIso),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl text-white">Agenda</h1>
        <p className="text-sm text-gris">
          {canManage
            ? "Un container agenda par salarié — fiches, scans, jours, pointage"
            : "Ton container agenda, planning et pointage"}
        </p>
      </header>

      {canManage ? (
        <ColorContainer
          tone="jaune"
          title="Nouveau salarié"
          subtitle="Nom, contrat, jours travaillés"
        >
          <AddEmployeeForm />
        </ColorContainer>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {cards.map((staff, index) => (
          <AgendaStaffContainer
            key={staff.id}
            staff={staff}
            canManage={canManage}
            toneClass={TONES[index % TONES.length]}
          />
        ))}
      </div>
    </div>
  );
}
