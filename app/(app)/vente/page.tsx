import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/profile";
import { createClientReadOnly } from "@/lib/supabase/server";
import { SaleScreen } from "@/components/vente/sale-screen";
import type { SaleProduct } from "@/lib/sales/types";

export const dynamic = "force-dynamic";

export default async function VentePage({
  searchParams,
}: {
  searchParams: { pos?: string };
}) {
  const profile = await requireProfile();
  if (profile.role === "producteur") redirect("/");

  const supabase = createClientReadOnly();

  const { data: productsRaw } = await supabase
    .from("products")
    .select("id, name, price_cents, is_active")
    .eq("is_active", true)
    .order("name");

  const { data: posList } = await supabase
    .from("points_of_sale")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  const pointsOfSale = (posList ?? []) as { id: string; name: string }[];

  let posId: string | null =
    profile.point_of_sale_id ??
    searchParams.pos ??
    pointsOfSale[0]?.id ??
    null;

  if (profile.role === "vendeur") {
    posId = profile.point_of_sale_id ?? null;
  }

  const stockByProduct = new Map<string, number>();
  if (posId) {
    const { data: stocks } = await supabase
      .from("stock_items")
      .select("product_id, quantity")
      .eq("point_of_sale_id", posId);

    for (const row of stocks ?? []) {
      const pid = row.product_id as string;
      stockByProduct.set(
        pid,
        (stockByProduct.get(pid) ?? 0) + (row.quantity as number),
      );
    }
  }

  const products: SaleProduct[] = (productsRaw ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    price_cents: p.price_cents as number,
    stock_quantity: stockByProduct.get(p.id as string) ?? 0,
  }));

  return (
    <SaleScreen
      profile={profile}
      products={products}
      pointsOfSale={pointsOfSale}
      initialPosId={posId}
    />
  );
}
