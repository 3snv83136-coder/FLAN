import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/profile";
import { createClientReadOnly } from "@/lib/supabase/server";
import { ColorContainer } from "@/components/ui/color-container";
import {
  FabricationPanel,
  type FabricationRow,
} from "@/components/fabrication/fabrication-panel";

export const dynamic = "force-dynamic";

function parisDateOffset(days: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export default async function FabricationPage() {
  const profile = await requireProfile();
  if (profile.role === "vendeur") redirect("/vente");

  const supabase = createClientReadOnly();
  const tomorrow = parisDateOffset(1);
  const yesterday = parisDateOffset(-1);

  const { data: plans } = await supabase
    .from("fabrication_plans")
    .select(
      "id, product_id, quantity_suggested, quantity_planned, based_on_loss_date, status",
    )
    .eq("for_date", tomorrow)
    .order("created_at");

  const { data: products } = await supabase.from("products").select("id, name");
  const nameById = new Map(
    (products ?? []).map((p) => [p.id as string, p.name as string]),
  );

  const rows: FabricationRow[] = (plans ?? []).map((p) => ({
    id: p.id as string,
    product_name: nameById.get(p.product_id as string) ?? "Produit",
    quantity_suggested: p.quantity_suggested as number,
    quantity_planned: p.quantity_planned as number,
    based_on_loss_date: p.based_on_loss_date as string,
    status: p.status as string,
  }));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl text-white">Fabrication</h1>
        <p className="text-sm text-gris">
          Flans à faire demain (pâtissier) — calés sur les invendus d’hier
        </p>
      </header>

      <ColorContainer
        tone="orange"
        title="À fabriquer demain"
        subtitle={`Cible ${tomorrow} · invendus du ${yesterday}`}
      >
        <FabricationPanel
          forDate={tomorrow}
          lossDate={yesterday}
          plans={rows}
        />
      </ColorContainer>
    </div>
  );
}
