"use client";

import { useState, useTransition } from "react";
import { createProduct, updateProduct } from "@/app/reglages/actions";
import { formatEuros } from "@/lib/utils";

export type ProductEditorItem = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
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

export function ProductCreateForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      action={(fd) => {
        setMessage(null);
        startTransition(async () => {
          const res = await createProduct(fd);
          if (res && "error" in res && res.error) setMessage(res.error);
          else setMessage("Produit ajouté.");
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        Nom
        <input
          name="name"
          required
          placeholder="ex. Flan pistache"
          className="min-h-11 rounded-xl bg-white px-3 text-brun"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description
        <input
          name="description"
          placeholder="court texte caisse"
          className="min-h-11 rounded-xl bg-white px-3 text-brun"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Prix (€)
        <input
          name="price_euros"
          type="number"
          min={0}
          step="0.01"
          required
          placeholder="4,50"
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
        {pending ? "…" : "Ajouter le produit"}
      </button>
      {message ? <p className="text-sm font-medium">{message}</p> : null}
    </form>
  );
}

export function ProductEditForm({ product }: { product: ProductEditorItem }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const euros = (product.price_cents / 100).toFixed(2);

  return (
    <form
      className="flex flex-col gap-3"
      action={(fd) => {
        setMessage(null);
        startTransition(async () => {
          const res = await updateProduct(fd);
          if (res && "error" in res && res.error) setMessage(res.error);
          else setMessage("Produit enregistré.");
        });
      }}
    >
      <input type="hidden" name="id" value={product.id} />
      <PhotoPreview url={product.photo_url} name={product.name} />
      <label className="flex flex-col gap-1 text-sm">
        Nom
        <input
          name="name"
          required
          defaultValue={product.name}
          className="min-h-11 rounded-xl bg-white px-3 text-brun"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description
        <input
          name="description"
          defaultValue={product.description ?? ""}
          className="min-h-11 rounded-xl bg-white px-3 text-brun"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Prix (€) — actuel {formatEuros(product.price_cents)}
        <input
          name="price_euros"
          type="number"
          min={0}
          step="0.01"
          required
          defaultValue={euros}
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
          defaultChecked={product.is_active}
        />
        En vente (visible à la caisse)
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
