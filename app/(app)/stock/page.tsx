import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { formatEuros } from "@/lib/utils";

export const dynamic = "force-dynamic";

type StockRow = {
  product_id: string;
  quantity: number;
  batch_id: string | null;
  products: { name: string; price_cents: number } | null;
  production_batches: { expiry_date: string } | null;
};

export default async function StockPage() {
  const profile = await requireProfile();
  if (profile.role === "producteur") redirect("/");

  const supabase = createClient();

  let posId = profile.point_of_sale_id;
  let posName = "Mon PDV";

  if (profile.role === "gerant") {
    const { data: firstPos } = await supabase
      .from("points_of_sale")
      .select("id, name")
      .eq("is_active", true)
      .order("name")
      .limit(1)
      .maybeSingle();
    posId = firstPos?.id ?? null;
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
    .select(
      "product_id, quantity, batch_id, products(name, price_cents), production_batches(expiry_date)",
    )
    .eq("point_of_sale_id", posId)
    .gt("quantity", 0)
    .order("updated_at");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const items = (rows ?? []) as unknown as StockRow[];

  const byProduct = new Map<
    string,
    {
      name: string;
      price_cents: number;
      quantity: number;
      nearestExpiry: string | null;
    }
  >();

  for (const row of items) {
    const name = row.products?.name ?? "Produit";
    const price = row.products?.price_cents ?? 0;
    const expiry = row.production_batches?.expiry_date ?? null;
    const current = byProduct.get(row.product_id);
    if (!current) {
      byProduct.set(row.product_id, {
        name,
        price_cents: price,
        quantity: row.quantity,
        nearestExpiry: expiry,
      });
    } else {
      current.quantity += row.quantity;
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
        <h1 className="font-display text-3xl text-brun">
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
