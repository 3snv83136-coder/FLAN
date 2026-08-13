import { createClientReadOnly } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { AppProfile } from "@/lib/sales/types";
import type { UserRole } from "@/types/database";

export async function requireProfile(): Promise<AppProfile> {
  const supabase = createClientReadOnly();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, point_of_sale_id, is_active")
    .eq("id", user.id)
    .single();

  if (error || !data || !data.is_active) {
    redirect("/login");
  }

  return {
    id: data.id as string,
    full_name: data.full_name as string,
    role: data.role as UserRole,
    point_of_sale_id: data.point_of_sale_id as string | null,
  };
}

export function homePathForRole(): string {
  return "/equipe";
}
