"use client";

import { useState, useTransition } from "react";
import {
  addAgendaItem,
  clockEvent,
  signedDocumentUrl,
  updateEmployeeHr,
  uploadEmployeeDocument,
} from "@/app/agenda/actions";

const WEEKDAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 7, label: "Dim" },
];

const CONTRACT_LABEL: Record<string, string> = {
  cdd: "CDD",
  cdi: "CDI",
  alternance: "Alternance",
  autre: "Autre",
};

export type AgendaEvent = {
  id: string;
  title: string;
  notes: string | null;
  starts_at: string;
  ends_at: string | null;
};

export type EmployeeDoc = {
  id: string;
  kind: string;
  file_path: string;
  original_name: string;
  created_at: string;
};

export type ClockEvent = {
  id: string;
  kind: string;
  clocked_at: string;
};

export type StaffCard = {
  id: string;
  full_name: string;
  role: string;
  contract_type: string | null;
  work_weekdays: number[];
  events: AgendaEvent[];
  documents: EmployeeDoc[];
  clocksToday: ClockEvent[];
  worksToday: boolean;
};

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function roleLabel(role: string) {
  if (role === "producteur") return "Pâtissier";
  if (role === "gerant") return "Gérant";
  return "Vendeur";
}

export function AgendaStaffContainer({
  staff,
  canManage,
  toneClass,
}: {
  staff: StaffCard;
  canManage: boolean;
  toneClass: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const lastClock = staff.clocksToday[0];
  const isIn = lastClock?.kind === "debut";

  return (
    <section
      className={`flex flex-col gap-4 rounded-2xl p-5 shadow-lg shadow-black/10 ${toneClass}`}
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
          Container agenda
        </p>
        <h2 className="font-display text-2xl font-semibold">{staff.full_name}</h2>
        <p className="text-sm opacity-80">
          {roleLabel(staff.role)}
          {staff.contract_type
            ? ` · ${CONTRACT_LABEL[staff.contract_type] ?? staff.contract_type}`
            : ""}
          {staff.worksToday ? " · travaille aujourd’hui" : " · jour off"}
        </p>
      </header>

      {canManage ? (
        <form
          className="flex flex-col gap-3 rounded-xl bg-black/10 p-3"
          action={(fd) => {
            setMessage(null);
            startTransition(async () => {
              const res = await updateEmployeeHr(fd);
              if (res && "error" in res && res.error) setMessage(res.error);
            });
          }}
        >
          <input type="hidden" name="profile_id" value={staff.id} />
          <label className="flex flex-col gap-1 text-sm">
            Nom
            <input
              name="full_name"
              defaultValue={staff.full_name}
              className="min-h-10 rounded-lg bg-white px-3 text-brun"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Contrat (CDD / CDI / alternance)
            <select
              name="contract_type"
              defaultValue={staff.contract_type ?? ""}
              className="min-h-10 rounded-lg bg-white px-3 text-brun"
            >
              <option value="">À préciser</option>
              <option value="cdi">CDI</option>
              <option value="cdd">CDD</option>
              <option value="alternance">Alternance</option>
              <option value="autre">Autre</option>
            </select>
          </label>
          <fieldset>
            <legend className="mb-1 text-sm">Jours travaillés / off</legend>
            <div className="flex flex-wrap gap-1">
              {WEEKDAYS.map((d) => (
                <label
                  key={d.value}
                  className="flex items-center gap-1 rounded-lg bg-white/30 px-2 py-1 text-xs"
                >
                  <input
                    type="checkbox"
                    name="work_weekdays"
                    value={d.value}
                    defaultChecked={staff.work_weekdays.includes(d.value)}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            disabled={pending}
            className="min-h-10 rounded-xl bg-black/20 text-sm font-semibold"
          >
            Enregistrer la fiche
          </button>
        </form>
      ) : (
        <p className="text-sm">
          Jours :{" "}
          {WEEKDAYS.filter((d) => staff.work_weekdays.includes(d.value))
            .map((d) => d.label)
            .join(" · ") || "aucun"}
        </p>
      )}

      <div className="rounded-xl bg-black/10 p-3">
        <h3 className="mb-2 font-semibold">Pointage</h3>
        {staff.clocksToday.length === 0 ? (
          <p className="text-sm opacity-80">Pas encore pointé aujourd’hui.</p>
        ) : (
          <ul className="mb-2 text-sm">
            {staff.clocksToday.map((c) => (
              <li key={c.id}>
                {c.kind === "debut" ? "Début" : "Fin"} · {formatWhen(c.clocked_at)}
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending || isIn}
            onClick={() =>
              startTransition(async () => {
                const res = await clockEvent(staff.id, "debut");
                if (res && "error" in res && res.error) setMessage(res.error);
              })
            }
            className="min-h-10 flex-1 rounded-xl bg-ok px-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Commence
          </button>
          <button
            type="button"
            disabled={pending || !isIn}
            onClick={() =>
              startTransition(async () => {
                const res = await clockEvent(staff.id, "fin");
                if (res && "error" in res && res.error) setMessage(res.error);
              })
            }
            className="min-h-10 flex-1 rounded-xl bg-brun px-3 text-sm font-semibold text-creme disabled:opacity-40"
          >
            Finit
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Créneaux agenda</h3>
        {staff.events.length === 0 ? (
          <p className="text-sm opacity-80">Rien de prévu.</p>
        ) : (
          <ul className="mb-3 flex flex-col gap-2">
            {staff.events.map((ev) => (
              <li key={ev.id} className="rounded-xl bg-black/10 px-3 py-2">
                <p className="font-semibold">{ev.title}</p>
                <p className="text-sm opacity-80">
                  {formatWhen(ev.starts_at)}
                  {ev.ends_at ? ` → ${formatWhen(ev.ends_at)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        {canManage ? (
          <form
            className="grid gap-2"
            action={(fd) => {
              startTransition(async () => {
                const res = await addAgendaItem(fd);
                if (res && "error" in res && res.error) setMessage(res.error);
              });
            }}
          >
            <input type="hidden" name="profile_id" value={staff.id} />
            <input
              name="title"
              required
              placeholder="ex. Marché Bastille"
              className="min-h-10 rounded-lg bg-white px-3 text-sm text-brun"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="datetime-local"
                name="starts_at"
                required
                className="min-h-10 rounded-lg bg-white px-2 text-sm text-brun"
              />
              <input
                type="datetime-local"
                name="ends_at"
                className="min-h-10 rounded-lg bg-white px-2 text-sm text-brun"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="min-h-10 rounded-xl bg-black/20 text-sm font-semibold"
            >
              Ajouter au planning
            </button>
          </form>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Documents (contrat scanné)</h3>
        {staff.documents.length === 0 ? (
          <p className="mb-2 text-sm opacity-80">Aucun scan pour l’instant.</p>
        ) : (
          <ul className="mb-2 flex flex-col gap-1 text-sm">
            {staff.documents.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    startTransition(async () => {
                      const res = await signedDocumentUrl(doc.file_path);
                      if (res.url) window.open(res.url, "_blank");
                      else if (res.error) setMessage(res.error);
                    })
                  }
                >
                  {doc.kind === "contrat" ? "Contrat" : "Autre"} · {doc.original_name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {canManage ? (
          <form
            className="flex flex-col gap-2"
            action={(fd) => {
              startTransition(async () => {
                const res = await uploadEmployeeDocument(fd);
                if (res && "error" in res && res.error) setMessage(res.error);
                else setMessage("Scan enregistré.");
              });
            }}
          >
            <input type="hidden" name="profile_id" value={staff.id} />
            <select
              name="kind"
              defaultValue="contrat"
              className="min-h-10 rounded-lg bg-white px-3 text-sm text-brun"
            >
              <option value="contrat">Contrat CDD / CDI / alternance</option>
              <option value="autre">Autre document</option>
            </select>
            <input
              type="file"
              name="file"
              accept="image/*,application/pdf"
              capture="environment"
              required
              className="text-sm"
            />
            <button
              type="submit"
              disabled={pending}
              className="min-h-10 rounded-xl bg-black/20 text-sm font-semibold"
            >
              Scanner / importer
            </button>
          </form>
        ) : null}
      </div>

      {message ? <p className="text-sm font-medium">{message}</p> : null}
    </section>
  );
}
