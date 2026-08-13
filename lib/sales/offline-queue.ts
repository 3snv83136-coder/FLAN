import type { PendingSale } from "@/lib/sales/types";

const QUEUE_KEY = "flan_pending_sales_v1";
const LOCAL_STOCK_KEY = "flan_local_stock_delta_v1";

function readQueue(): PendingSale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingSale[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(sales: PendingSale[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(sales));
}

export function getPendingSales(): PendingSale[] {
  return readQueue();
}

export function enqueueSale(sale: PendingSale) {
  const queue = readQueue();
  if (queue.some((s) => s.id === sale.id)) return;
  queue.push(sale);
  writeQueue(queue);
}

export function removePendingSale(saleId: string) {
  writeQueue(readQueue().filter((s) => s.id !== saleId));
}

export function pendingCount(): number {
  return readQueue().length;
}

/** Ajustements de stock locaux (vente offline pas encore sync). */
export function applyLocalStockDelta(
  pointOfSaleId: string,
  productId: string,
  delta: number,
) {
  const map = readLocalStock();
  const key = `${pointOfSaleId}:${productId}`;
  map[key] = (map[key] ?? 0) + delta;
  localStorage.setItem(LOCAL_STOCK_KEY, JSON.stringify(map));
}

export function getLocalStockDelta(
  pointOfSaleId: string,
  productId: string,
): number {
  return readLocalStock()[`${pointOfSaleId}:${productId}`] ?? 0;
}

export function clearLocalStockDeltasForSale(
  pointOfSaleId: string,
  items: { product_id: string; quantity: number }[],
) {
  const map = readLocalStock();
  for (const item of items) {
    const key = `${pointOfSaleId}:${item.product_id}`;
    // la sync serveur a déjà décrémenté : on annule le delta local négatif
    map[key] = (map[key] ?? 0) + item.quantity;
    if (map[key] === 0) delete map[key];
  }
  localStorage.setItem(LOCAL_STOCK_KEY, JSON.stringify(map));
}

function readLocalStock(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_STOCK_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}
