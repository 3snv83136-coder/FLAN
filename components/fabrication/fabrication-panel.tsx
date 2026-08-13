"use client";

import { useState, useTransition } from "react";
import {
  markFabricationDone,
  refreshFabricationPlans,
  updateFabricationPlanned,
} from "@/app/fabrication/actions";

export type FabricationRow = {
  id: string;
  product_name: string;
  quantity_suggested: number;
  quantity_planned: number;
  based_on_loss_date: string;
  status: string;
};

export function FabricationPanel({
  forDate,
  lossDate,
  plans,
}: {
  forDate: string;
  lossDate: string;
  plans: FabricationRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onRefresh() {
    setMessage(null);
    startTransition(async () => {
      const res = await refreshFabricationPlans();
      if (res && "error" in res && res.error) {
        setMessage(res.error);
      } else {
        setMessage("Plan recalculé depuis les invendus.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm opacity-90">
          Pour le <strong>{forDate}</strong> · base invendus{" "}
          <strong>{lossDate}</strong>
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={onRefresh}
          className="rounded-xl bg-brun/20 px-3 py-2 text-sm font-medium hover:bg-brun/30 disabled:opacity-50"
        >
          {pending ? "…" : "Recalculer"}
        </button>
      </div>

      {plans.length === 0 ? (
        <p className="rounded-xl bg-black/10 px-3 py-3 text-sm">
          Aucun invendu hier → rien à planifier. Ou clique « Recalculer » après
          avoir saisi des pertes invendues.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {plans.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-black/10 px-3 py-3"
            >
              <div>
                <p className="font-semibold">{p.product_name}</p>
                <p className="text-sm opacity-80">
                  Suggestion (invendus) : {p.quantity_suggested}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  À faire
                  <input
                    type="number"
                    min={0}
                    defaultValue={p.quantity_planned}
                    disabled={p.status !== "a_faire" || pending}
                    className="w-20 rounded-lg border-0 bg-white px-2 py-1 text-brun"
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (Number.isNaN(value) || value < 0) return;
                      startTransition(async () => {
                        await updateFabricationPlanned(p.id, value);
                      });
                    }}
                  />
                </label>
                {p.status === "a_faire" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await markFabricationDone(p.id);
                      })
                    }
                    className="rounded-xl bg-brun px-3 py-2 text-sm font-medium text-creme"
                  >
                    Fait
                  </button>
                ) : (
                  <span className="rounded-lg bg-ok/30 px-2 py-1 text-xs font-medium">
                    {p.status}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {message ? <p className="text-sm font-medium">{message}</p> : null}
    </div>
  );
}
