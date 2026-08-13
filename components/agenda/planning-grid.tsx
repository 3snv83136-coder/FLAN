"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteAgendaItem, generatePlanning } from "@/app/agenda/actions";
import type { AgendaEvent } from "@/components/agenda/agenda-staff-container";
import {
  addDaysYmd,
  formatDayLabel,
  isoWeekdayFromYmd,
  startOfWeekMonday,
  type PlanningVue,
} from "@/lib/agenda/dates";

export type PlanningPerson = {
  id: string;
  full_name: string;
  role: string;
  contract_type: string | null;
  work_weekdays: number[];
  usual_start_time: string;
  usual_end_time: string;
  max_hours_per_week: number | null;
  constraint_notes: string | null;
  events: AgendaEvent[];
};

const ROLE: Record<string, string> = {
  vendeur: "Vendeur",
  producteur: "Pâtissier",
  gerant: "Gérant",
};

const CONTRACT: Record<string, string> = {
  cdd: "CDD",
  cdi: "CDI",
  alternance: "Alternance",
  autre: "Autre",
};

function anyWeekOver(events: AgendaEvent[], maxHours: number) {
  const byWeek = new Map<string, number>();
  for (const e of events) {
    const day = ymdOf(e.starts_at);
    const week = startOfWeekMonday(day);
    const h = e.ends_at
      ? Math.max(
          0,
          (new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime()) /
            3600_000,
        )
      : 0;
    byWeek.set(week, (byWeek.get(week) ?? 0) + h);
  }
  return Array.from(byWeek.values()).some((h) => h > maxHours);
}

function ymdOf(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function hhmm(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function PlanningGrid({
  vue,
  from,
  to,
  days,
  people,
  canManage,
}: {
  vue: PlanningVue;
  from: string;
  to: string;
  days: string[];
  people: PlanningPerson[];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const prevFrom =
    vue === "mois" ? addDaysYmd(from, -1).slice(0, 7) + "-01" : addDaysYmd(from, -7);
  const nextFrom = vue === "mois" ? addDaysYmd(to, 1) : addDaysYmd(from, 7);

  return (
    <section className="rounded-2xl bg-container-cyan p-5 text-brun shadow-lg shadow-black/10">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Planning équipe
          </p>
          <h2 className="font-display text-2xl font-semibold">
            {vue === "mois" ? "Vue mois" : "Vue semaine"}
          </h2>
          <p className="text-sm opacity-80">
            {from} → {to} · calé sur les contraintes de chacun
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/agenda?vue=semaine&from=${from}`}
            className={`rounded-xl px-3 py-2 text-sm font-medium ${
              vue === "semaine" ? "bg-brun text-creme" : "bg-white/50"
            }`}
          >
            Semaine
          </Link>
          <Link
            href={`/agenda?vue=mois&from=${from}`}
            className={`rounded-xl px-3 py-2 text-sm font-medium ${
              vue === "mois" ? "bg-brun text-creme" : "bg-white/50"
            }`}
          >
            Mois
          </Link>
          <Link
            href={`/agenda?vue=${vue}&from=${prevFrom}`}
            className="rounded-xl bg-white/50 px-3 py-2 text-sm"
          >
            ←
          </Link>
          <Link
            href={`/agenda?vue=${vue}&from=${nextFrom}`}
            className="rounded-xl bg-white/50 px-3 py-2 text-sm"
          >
            →
          </Link>
        </div>
      </header>

      {canManage ? (
        <form
          className="mb-4"
          action={(fd) => {
            setMessage(null);
            startTransition(async () => {
              const res = await generatePlanning(fd);
              if (res && "error" in res && res.error) {
                setMessage(res.error);
                return;
              }
              if (res && "created" in res) {
                const skipped = res.skipped ?? [];
                const extra =
                  skipped.length > 0 ? ` · ignoré : ${skipped.join(" · ")}` : "";
                setMessage(`${res.created} créneau(x) posé(s)${extra}`);
              }
            });
          }}
        >
          <input type="hidden" name="vue" value={vue} />
          <input type="hidden" name="from" value={from} />
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-xl bg-brun px-4 text-sm font-semibold text-creme disabled:opacity-50"
          >
            {pending
              ? "…"
              : `Générer le planning ${vue} (jours + horaires de chacun)`}
          </button>
        </form>
      ) : null}

      {message ? <p className="mb-3 text-sm font-medium">{message}</p> : null}

      <div className="overflow-x-auto rounded-xl bg-white/40">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-container-cyan px-2 py-2">Salarié</th>
              {days.map((d) => (
                <th key={d} className="px-1 py-2 font-medium">
                  {formatDayLabel(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const over =
                p.max_hours_per_week != null &&
                anyWeekOver(p.events, Number(p.max_hours_per_week));
              return (
                <tr key={p.id} className="border-t border-brun/10">
                  <td className="sticky left-0 bg-container-cyan px-2 py-2 align-top">
                    <p className="font-semibold">{p.full_name}</p>
                    <p className="text-xs opacity-80">
                      {ROLE[p.role] ?? p.role}
                      {p.contract_type
                        ? ` · ${CONTRACT[p.contract_type]}`
                        : ""}
                    </p>
                    <p className="text-xs opacity-80">
                      {p.usual_start_time.slice(0, 5)}–
                      {p.usual_end_time.slice(0, 5)}
                      {p.max_hours_per_week
                        ? ` · max ${p.max_hours_per_week}h`
                        : ""}
                    </p>
                    {over ? (
                      <p className="text-xs font-semibold text-alerte">
                        Plafond heures dépassé
                      </p>
                    ) : null}
                    {p.constraint_notes ? (
                      <p className="mt-1 text-xs">{p.constraint_notes}</p>
                    ) : null}
                  </td>
                  {days.map((d) => {
                    const off = !p.work_weekdays.includes(isoWeekdayFromYmd(d));
                    const dayEvents = p.events.filter((e) => ymdOf(e.starts_at) === d);
                    return (
                      <td
                        key={d}
                        className={`min-w-[88px] px-1 py-1 align-top ${
                          off ? "bg-black/10 opacity-60" : ""
                        }`}
                      >
                        {off ? (
                          <span className="text-xs">Off</span>
                        ) : dayEvents.length === 0 ? (
                          <span className="text-xs opacity-50">—</span>
                        ) : (
                          dayEvents.map((e) => (
                            <div
                              key={e.id}
                              className="mb-1 rounded-lg bg-brun px-1.5 py-1 text-xs text-creme"
                            >
                              <p className="font-medium">{e.title}</p>
                              <p>
                                {hhmm(e.starts_at)}
                                {e.ends_at ? `–${hhmm(e.ends_at)}` : ""}
                              </p>
                              {canManage ? (
                                <button
                                  type="button"
                                  className="underline opacity-80"
                                  onClick={() =>
                                    startTransition(async () => {
                                      await deleteAgendaItem(e.id);
                                    })
                                  }
                                >
                                  retirer
                                </button>
                              ) : null}
                            </div>
                          ))
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
