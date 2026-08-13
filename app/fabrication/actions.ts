"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function refreshFabricationPlans() {
  const supabase = createClient();
  const { error } = await supabase.rpc(
    "refresh_fabrication_plans_from_invendus",
  );
  if (error) {
    return { error: error.message };
  }
  revalidatePath("/fabrication");
  revalidatePath("/");
  return { ok: true as const };
}

export async function updateFabricationPlanned(
  planId: string,
  quantityPlanned: number,
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("fabrication_plans")
    .update({ quantity_planned: quantityPlanned })
    .eq("id", planId)
    .eq("status", "a_faire");

  if (error) return { error: error.message };
  revalidatePath("/fabrication");
  return { ok: true as const };
}

export async function markFabricationDone(planId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("fabrication_plans")
    .update({ status: "fait" })
    .eq("id", planId);

  if (error) return { error: error.message };
  revalidatePath("/fabrication");
  return { ok: true as const };
}
