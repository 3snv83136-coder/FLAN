"use client";

import { useState, useTransition } from "react";
import { createEmployee } from "@/app/agenda/actions";

const WEEKDAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 7, label: "Dim" },
];

export function AddEmployeeForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          const res = await createEmployee(formData);
          if (res && "error" in res && res.error) setMessage(res.error);
          else setMessage("Salarié ajouté — il apparaît dans l’agenda.");
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Nom du salarié
        <input
          name="full_name"
          required
          placeholder="ex. Léa Martin"
          className="min-h-11 rounded-xl border-0 bg-white px-3 text-brun"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Rôle
        <select
          name="role"
          defaultValue="vendeur"
          className="min-h-11 rounded-xl border-0 bg-white px-3 text-brun"
        >
          <option value="vendeur">Vendeur</option>
          <option value="producteur">Pâtissier</option>
          <option value="gerant">Gérant</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Contrat
        <select
          name="contract_type"
          defaultValue=""
          className="min-h-11 rounded-xl border-0 bg-white px-3 text-brun"
        >
          <option value="">À préciser</option>
          <option value="cdi">CDI</option>
          <option value="cdd">CDD</option>
          <option value="alternance">Alternance</option>
          <option value="autre">Autre</option>
        </select>
      </label>

      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm">Jours travaillés</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => (
            <label
              key={d.value}
              className="flex items-center gap-1 rounded-lg bg-black/10 px-2 py-1 text-sm"
            >
              <input
                type="checkbox"
                name="work_weekdays"
                value={d.value}
                defaultChecked={d.value <= 5}
              />
              {d.label}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-xl bg-brun px-4 font-semibold text-creme disabled:opacity-50 sm:col-span-2"
      >
        {pending ? "…" : "Ajouter le salarié"}
      </button>
      {message ? <p className="text-sm font-medium sm:col-span-2">{message}</p> : null}
    </form>
  );
}
