import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/profile";
import { createClientReadOnly } from "@/lib/supabase/server";
import { formatEuros } from "@/lib/utils";
import { ColorContainer } from "@/components/ui/color-container";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await requireProfile();
  if (profile.role !== "gerant") redirect("/equipe");

  const supabase = createClientReadOnly();

  const parisDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

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

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("is_active", true)
    .order("full_name");

  const { count: fabCount } = await supabase
    .from("fabrication_plans")
    .select("id", { count: "exact", head: true })
    .eq("status", "a_faire");

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl text-white">Dashboard</h1>
        <p className="text-sm text-gris">Ventes du jour — {parisDate}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ColorContainer tone="jaune" title="CA du jour" subtitle="Global">
          <p className="font-display text-4xl font-semibold">
            {formatEuros(globalTotal)}
          </p>
          <p className="text-sm opacity-80">
            {todaySales.length} vente{todaySales.length === 1 ? "" : "s"}
          </p>
        </ColorContainer>

        <ColorContainer
          tone="orange"
          title="Fabrication demain"
          subtitle="Pâtissier"
          action={
            <Link
              href="/fabrication"
              className="rounded-xl bg-brun/20 px-3 py-1 text-sm font-medium"
            >
              Ouvrir
            </Link>
          }
        >
          <p className="text-3xl font-semibold">{fabCount ?? 0}</p>
          <p className="text-sm opacity-80">ligne(s) à faire</p>
        </ColorContainer>

        <ColorContainer
          tone="cyan"
          title="Site"
          subtitle="Magasins, photos, produits, prix"
          action={
            <Link
              href="/reglages"
              className="rounded-xl bg-brun/20 px-3 py-1 text-sm font-medium"
            >
              Ouvrir
            </Link>
          }
        >
          <p className="text-sm opacity-80">
            Changer les noms, ajouter un magasin, poser une photo.
          </p>
        </ColorContainer>
      </div>

      <ColorContainer
        tone="violet"
        title="Agenda équipe"
        subtitle="Un container par salarié"
        action={
          <Link
            href="/agenda"
            className="rounded-xl bg-white/20 px-3 py-1 text-sm font-medium"
          >
            Voir tout
          </Link>
        }
      >
        <ul className="grid gap-2 sm:grid-cols-3">
          {(staff ?? []).map((p) => (
            <li
              key={p.id as string}
              className="rounded-xl bg-black/15 px-3 py-2 text-sm"
            >
              <p className="font-semibold">{p.full_name as string}</p>
              <p className="opacity-80">
                {p.role === "producteur"
                  ? "Pâtissier"
                  : p.role === "gerant"
                    ? "Gérant"
                    : "Vendeur"}
              </p>
            </li>
          ))}
        </ul>
      </ColorContainer>

      <section>
        <h2 className="mb-3 font-display text-xl text-white">Par point de vente</h2>
        {posRows.length === 0 ? (
          <ColorContainer tone="blanc" title="Aucune vente">
            <p className="text-sm opacity-80">Pas encore de vente aujourd’hui.</p>
          </ColorContainer>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {posRows.map((row, i) => (
              <ColorContainer
                key={row.name}
                tone={i % 2 === 0 ? "cyan" : "vert"}
                title={row.name}
              >
                <p className="font-display text-2xl font-semibold">
                  {formatEuros(row.total)}
                </p>
                <p className="text-sm opacity-80">
                  {row.count} vente{row.count === 1 ? "" : "s"}
                </p>
              </ColorContainer>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
