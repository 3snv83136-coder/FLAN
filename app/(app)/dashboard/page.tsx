import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/profile";
import { createClientReadOnly } from "@/lib/supabase/server";
import { formatEuros } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireProfile();
  if (profile.role !== "gerant") redirect("/vente");

  const supabase = createClientReadOnly();

  const parisDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // Fenêtre large ; filtre « jour Paris » côté app
  const { data: sales } = await supabase
    .from("sales")
    .select("id, total_cents, point_of_sale_id, sold_at")
    .gte("sold_at", `${parisDate}T00:00:00.000Z`)
    .order("sold_at", { ascending: false });

  const { data: posAll } = await supabase
    .from("points_of_sale")
    .select("id, name");

  const posNameById = new Map(
    (posAll ?? []).map((p) => [p.id as string, p.name as string]),
  );

  type SaleRow = {
    id: string;
    total_cents: number;
    point_of_sale_id: string;
    sold_at: string;
  };

  const todaySales = ((sales ?? []) as SaleRow[]).filter((s) => {
    const local = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(s.sold_at));
    return local === parisDate;
  });

  const byPos = new Map<string, { name: string; total: number; count: number }>();
  let globalTotal = 0;

  for (const sale of todaySales) {
    globalTotal += sale.total_cents;
    const name = posNameById.get(sale.point_of_sale_id) ?? "PDV";
    const cur = byPos.get(sale.point_of_sale_id) ?? {
      name,
      total: 0,
      count: 0,
    };
    cur.total += sale.total_cents;
    cur.count += 1;
    byPos.set(sale.point_of_sale_id, cur);
  }

  const posRows = Array.from(byPos.values()).sort((a, b) => b.total - a.total);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl text-brun">Dashboard</h1>
        <p className="text-sm text-gris">Ventes du jour — {parisDate}</p>
      </header>

      <section className="rounded-2xl bg-caramel p-6 text-creme">
        <p className="text-sm text-creme/80">CA global du jour</p>
        <p className="font-display text-4xl font-semibold">
          {formatEuros(globalTotal)}
        </p>
        <p className="mt-1 text-sm text-creme/80">
          {todaySales.length} vente{todaySales.length === 1 ? "" : "s"}
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl text-brun">Par point de vente</h2>
        {posRows.length === 0 ? (
          <p className="rounded-2xl border border-gris/25 bg-white/70 p-6 text-gris">
            Pas encore de vente aujourd’hui.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {posRows.map((row) => (
              <li
                key={row.name}
                className="rounded-2xl border border-gris/25 bg-white/80 p-4"
              >
                <p className="font-medium text-brun">{row.name}</p>
                <p className="font-display text-2xl text-caramel">
                  {formatEuros(row.total)}
                </p>
                <p className="text-sm text-gris">
                  {row.count} vente{row.count === 1 ? "" : "s"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
