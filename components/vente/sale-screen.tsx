"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  applyLocalStockDelta,
  clearLocalStockDeltasForSale,
  enqueueSale,
  getLocalStockDelta,
  getPendingSales,
  removePendingSale,
} from "@/lib/sales/offline-queue";
import type {
  AppProfile,
  CartLine,
  PendingSale,
  SaleProduct,
} from "@/lib/sales/types";
import type { PaymentMethod } from "@/types/database";
import { formatEuros } from "@/lib/utils";

type PosOption = { id: string; name: string };

function notifyQueue() {
  window.dispatchEvent(new Event("flan-queue-changed"));
}

async function syncSale(
  sale: PendingSale,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.rpc("record_sale", {
    p_id: sale.id,
    p_point_of_sale_id: sale.point_of_sale_id,
    p_total_cents: sale.total_cents,
    p_payment_method: sale.payment_method,
    p_sold_at: sale.sold_at,
    p_items: sale.items,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  removePendingSale(sale.id);
  clearLocalStockDeltasForSale(sale.point_of_sale_id, sale.items);
  notifyQueue();
  return { ok: true };
}

export function SaleScreen({
  profile,
  products,
  pointsOfSale,
  initialPosId,
}: {
  profile: AppProfile;
  products: SaleProduct[];
  pointsOfSale: PosOption[];
  initialPosId: string | null;
}) {
  const router = useRouter();
  const [posId, setPosId] = useState<string | null>(
    profile.point_of_sale_id ?? initialPosId,
  );
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<PaymentMethod>("especes");
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [stockVersion, setStockVersion] = useState(0);

  const stockMap: Record<string, number> = {};
  if (posId) {
    void stockVersion;
    for (const p of products) {
      stockMap[p.id] = Math.max(
        0,
        p.stock_quantity + getLocalStockDelta(posId, p.id),
      );
    }
  }

  const totalCents = useMemo(
    () => cart.reduce((sum, l) => sum + l.unit_price_cents * l.quantity, 0),
    [cart],
  );

  const flushQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    const queue = getPendingSales();
    for (const sale of queue) {
      const result = await syncSale(sale);
      if (!result.ok) break;
    }
    setStockVersion((t) => t + 1);
    router.refresh();
  }, [router]);

  useEffect(() => {
    void flushQueue();
    const onOnline = () => void flushQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flushQueue]);

  function addProduct(p: SaleProduct) {
    setError(null);
    const available = stockMap[p.id] ?? 0;
    const inCart = cart.find((l) => l.product_id === p.id)?.quantity ?? 0;
    if (inCart + 1 > available) {
      setError(`Plus assez de ${p.name} en stock.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.product_id === p.id);
      if (existing) {
        return prev.map((l) =>
          l.product_id === p.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          product_id: p.id,
          name: p.name,
          unit_price_cents: p.price_cents,
          quantity: 1,
        },
      ];
    });
  }

  function decLine(productId: string) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product_id === productId ? { ...l, quantity: l.quantity - 1 } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }

  function clearCart() {
    setCart([]);
    setError(null);
  }

  async function recordSale() {
    if (!posId) {
      setError("Choisis un point de vente.");
      return;
    }
    if (cart.length === 0) {
      setError("Ajoute au moins un flan.");
      return;
    }

    setSaving(true);
    setError(null);

    const sale: PendingSale = {
      id: crypto.randomUUID(),
      point_of_sale_id: posId,
      sold_by: profile.id,
      total_cents: totalCents,
      payment_method: payment,
      sold_at: new Date().toISOString(),
      items: cart.map((l) => ({
        id: crypto.randomUUID(),
        product_id: l.product_id,
        quantity: l.quantity,
        unit_price_cents: l.unit_price_cents,
      })),
    };

    enqueueSale(sale);
    for (const item of sale.items) {
      applyLocalStockDelta(posId, item.product_id, -item.quantity);
    }
    notifyQueue();
    setStockVersion((t) => t + 1);
    setCart([]);
    setFlash("Vente enregistrée");
    window.setTimeout(() => setFlash(null), 1600);

    if (navigator.onLine) {
      const result = await syncSale(sale);
      if (!result.ok) {
        setError(
          "Vente sauvée sur la tablette. Sync en attente — vérifie le stock à la reconnexion.",
        );
      } else {
        router.refresh();
      }
    }

    setSaving(false);
  }

  const needsPosPick = !profile.point_of_sale_id && profile.role === "gerant";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-brun">Vente</h1>
            <p className="text-sm text-gris">
              2 taps : produit, puis enregistrer.
            </p>
          </div>
          {needsPosPick ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gris">Point de vente</span>
              <select
                className="min-h-11 rounded-xl border border-gris/40 bg-white px-3 text-brun"
                value={posId ?? ""}
                onChange={(e) => {
                  const next = e.target.value || null;
                  setPosId(next);
                  setCart([]);
                  if (next) router.push(`/vente?pos=${next}`);
                }}
              >
                <option value="">Choisir…</option>
                {pointsOfSale.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {products.map((p) => {
            const qty = stockMap[p.id] ?? 0;
            const disabled = qty <= 0 || !posId;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => addProduct(p)}
                className="flex min-h-[120px] flex-col items-start justify-between rounded-2xl bg-caramel p-4 text-left text-creme shadow-sm transition hover:bg-caramel/90 disabled:cursor-not-allowed disabled:bg-gris/40"
              >
                <span className="font-display text-xl font-semibold leading-tight">
                  {p.name}
                </span>
                <span className="w-full">
                  <span className="block text-lg font-semibold">
                    {formatEuros(p.price_cents)}
                  </span>
                  <span className="text-sm text-creme/80">
                    {qty <= 0 ? "Rupture" : `${qty} en stock`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="flex flex-col gap-4 rounded-2xl border border-gris/25 bg-white/80 p-4">
        <h2 className="font-display text-xl text-brun">Panier</h2>

        {cart.length === 0 ? (
          <p className="text-sm text-gris">Vide — tape un flan.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {cart.map((l) => (
              <li
                key={l.product_id}
                className="flex items-center justify-between gap-2 rounded-xl bg-creme px-3 py-2"
              >
                <div>
                  <p className="font-medium text-brun">{l.name}</p>
                  <p className="text-sm text-gris">
                    {l.quantity} × {formatEuros(l.unit_price_cents)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => decLine(l.product_id)}
                  className="min-h-10 min-w-10 rounded-xl border border-gris/30 text-lg text-brun"
                  aria-label={`Retirer un ${l.name}`}
                >
                  −
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="font-display text-3xl font-semibold text-brun">
          {formatEuros(totalCents)}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPayment("especes")}
            className={`min-h-12 rounded-xl text-sm font-semibold ${
              payment === "especes"
                ? "bg-brun text-creme"
                : "border border-gris/30 text-brun"
            }`}
          >
            Espèces
          </button>
          <button
            type="button"
            onClick={() => setPayment("cb")}
            className={`min-h-12 rounded-xl text-sm font-semibold ${
              payment === "cb"
                ? "bg-brun text-creme"
                : "border border-gris/30 text-brun"
            }`}
          >
            CB
          </button>
        </div>

        {error ? (
          <p
            className="rounded-xl bg-alerte/10 px-3 py-2 text-sm text-alerte"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {flash ? (
          <p className="rounded-xl bg-ok/15 px-3 py-2 text-sm font-medium text-ok">
            {flash}
          </p>
        ) : null}

        <button
          type="button"
          disabled={saving || cart.length === 0}
          onClick={() => void recordSale()}
          className="min-h-14 rounded-xl bg-ok text-lg font-semibold text-white transition hover:bg-ok/90 disabled:opacity-50"
        >
          {saving ? "…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={clearCart}
          className="min-h-11 rounded-xl text-sm text-gris underline"
        >
          Vider le panier
        </button>
      </aside>
    </div>
  );
}
