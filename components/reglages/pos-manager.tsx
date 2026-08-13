"use client";

import { useState, useTransition } from "react";
import {
  createPointOfSale,
  updatePointOfSale,
} from "@/app/reglages/actions";

const POS_TYPES = [
  { value: "boutique", label: "Boutique" },
  { value: "marche", label: "Marché" },
  { value: "stand", label: "Stand" },
  { value: "autre", label: "Autre" },
] as const;

export type PosEditorItem = {
  id: string;
  name: string;
  type: string;
  address: string | null;
  is_active: boolean;
  photo_url: string | null;
};

function PhotoPreview({ url, name }: { url: string | null; name: string }) {
  if (!url) {
    return (
      <div className="flex h-28 items-center justify-center rounded-xl bg-black/10 text-sm opacity-70">
        Pas encore de photo
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      className="h-28 w-full rounded-xl object-cover"
    />
  );
}

export function PosCreateForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      action={(fd) => {
        setMessage(null);
        startTransition(async () => {
          const res = await createPointOfSale(fd);
          if (res && "error" in res && res.error) setMessage(res.error);
          else setMessage("Magasin ajouté.");
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        Nom
        <input
          name="name"
          required
          placeholder="ex. Marché des Enfants Rouges"
          className="min-h-11 rounded-xl bg-white px-3 text-brun"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Type
        <select
          name="type"
          defaultValue="boutique"
          className="min-h-11 rounded-xl bg-white px-3 text-brun"
        >
          {POS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Adresse
        <input
          name="address"
          placeholder="rue, ville, ou emplacement marché"
          className="min-h-11 rounded-xl bg-white px-3 text-brun"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Photo
        <input
          type="file"
          name="photo"
          accept="image/*"
          capture="environment"
          className="text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-xl bg-brun text-sm font-semibold text-creme disabled:opacity-50"
      >
        {pending ? "…" : "Ajouter le magasin"}
      </button>
      {message ? <p className="text-sm font-medium">{message}</p> : null}
    </form>
  );
}

export function PosEditForm({ pos }: { pos: PosEditorItem }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      action={(fd) => {
        setMessage(null);
        startTransition(async () => {
          const res = await updatePointOfSale(fd);
          if (res && "error" in res && res.error) setMessage(res.error);
          else setMessage("Magasin enregistré.");
        });
      }}
    >
      <input type="hidden" name="id" value={pos.id} />
      <PhotoPreview url={pos.photo_url} name={pos.name} />
      <label className="flex flex-col gap-1 text-sm">
        Nom
        <input
          name="name"
          required
          defaultValue={pos.name}
          className="min-h-11 rounded-xl bg-white px-3 text-brun"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Type
        <select
          name="type"
          defaultValue={pos.type}
          className="min-h-11 rounded-xl bg-white px-3 text-brun"
        >
          {POS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Adresse
        <input
          name="address"
          defaultValue={pos.address ?? ""}
          className="min-h-11 rounded-xl bg-white px-3 text-brun"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Nouvelle photo
        <input
          type="file"
          name="photo"
          accept="image/*"
          capture="environment"
          className="text-sm"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={pos.is_active}
        />
        Magasin ouvert (visible à la caisse)
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-xl bg-black/20 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "…" : "Enregistrer"}
      </button>
      {message ? <p className="text-sm font-medium">{message}</p> : null}
    </form>
  );
}
