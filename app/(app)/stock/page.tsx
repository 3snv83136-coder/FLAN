import { requireProfile } from "@/lib/auth/profile";
import { createClientReadOnly } from "@/lib/supabase/server";
import { formatEuros } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const profile = await requireProfile();
  const supabase = createClientReadOnly();

  let posId = profile.point_of_sale_id;
  let posName = "Mon PDV";

  if (profile.role === "gerant" || profile.role === "producteur") {
    const { data: firstPos } = await supabase
      .from("points_of_sale")
      .select("id, name")
      .eq("is_active", true)
      .order("name")
      .limit(1)
      .maybeSingle();
    posId = (firstPos?.id as string | undefined) ?? null;
    posName = (firstPos?.name as string) ?? "PDV";
  } else if (posId) {
    const { data: pos } = await supabase
      .from("points_of_sale")
      .select("name")
      .eq("id", posId)
      .maybeSingle();
    posName = (pos?.name as string) ?? "Mon PDV";
  }

  if (!posId) {
    return (
      <p className="text-gris">Aucun point de vente rattaché à ton compte.</p>
    );
  }

  const { data: rows } = await supabase
    .from("stock_items")
    .select("product_id, quantity, batch_id")
    .eq("point_of_sale_id", posId)
    .gt("quantity", 0);

  const { data: products } = await supabase
    .from("products")
    .select("id, name, price_cents");

  const productById = new Map(
    (products ?? []).map((p) => [
      p.id as string,
      {
        name: p.name as string,
        price_cents: p.price_cents as number,
      },
    ]),
  );

  const batchIds = Array.from(
    new Set(
      (rows ?? [])
        .map((r) => r.batch_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const expiryByBatch = new Map<string, string>();
  if (batchIds.length > 0) {
    const { data: batches } = await supabase
      .from("production_batches")
      .select("id, expiry_date")
      .in("id", batchIds);
    for (const b of batches ?? []) {
      expiryByBatch.set(b.id as string, b.expiry_date as string);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byProduct = new Map<
    string,
    {
      name: string;
      price_cents: number;
      quantity: number;
      nearestExpiry: string | null;
    }
  >();

  for (const row of rows ?? []) {
    const productId = row.product_id as string;
    const product = productById.get(productId);
    const name = product?.name ?? "Produit";
    const price = product?.price_cents ?? 0;
    const expiry = row.batch_id
      ? (expiryByBatch.get(row.batch_id as string) ?? null)
      : null;
    const current = byProduct.get(productId);
    if (!current) {
      byProduct.set(productId, {
        name,
        price_cents: price,
        quantity: row.quantity as number,
        nearestExpiry: expiry,
      });
    } else {
      current.quantity += row.quantity as number;
      if (
        expiry &&
        (!current.nearestExpiry || expiry < current.nearestExpiry)
      ) {
        current.nearestExpiry = expiry;
      }
    }
  }

  const list = Array.from(byProduct.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "fr"),
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl text-white">
          {profile.role === "vendeur" ? "Mon stock" : "Stock"}
        </h1>
        <p className="text-sm text-gris">{posName}</p>
      </header>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-gris/25 bg-white/70 p-6 text-gris">
          Aucun flan en stock ici pour l’instant.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((item) => {
            const expired =
              item.nearestExpiry != null &&
              new Date(item.nearestExpiry) < today;
            const soon =
              !expired &&
              item.nearestExpiry != null &&
              (new Date(item.nearestExpiry).getTime() - today.getTime()) /
                (1000 * 60 * 60 * 24) <=
                2;

            return (
              <li
                key={item.name}
                className="rounded-2xl border border-gris/25 bg-white/80 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl text-brun">{item.name}</p>
                    <p className="text-sm text-gris">
                      {formatEuros(item.price_cents)}
                    </p>
                  </div>
                  <p className="text-2xl font-semibold text-brun">
                    {item.quantity}
                  </p>
                </div>
                {expired ? (
                  <p className="mt-3 rounded-lg bg-alerte/15 px-2 py-1 text-sm font-medium text-alerte">
                    Lot périmé — à retirer
                  </p>
                ) : soon ? (
                  <p className="mt-3 rounded-lg bg-ambre/30 px-2 py-1 text-sm text-brun">
                    DLC proche ({item.nearestExpiry})
                  </p>
                ) : item.nearestExpiry ? (
                  <p className="mt-3 text-sm text-gris">
                    DLC {item.nearestExpiry}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-ok">Stock OK</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
