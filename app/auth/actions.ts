"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = createServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}

export type LoginCandidate = {
  id: string;
  email: string;
  full_name: string;
  role: string;
};

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Variables Supabase manquantes");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function listLoginCandidates(): Promise<LoginCandidate[]> {
  try {
    const admin = createAdminClient();

    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("is_active", true)
      .order("full_name");

    if (profilesError) {
      console.error("listLoginCandidates profiles", profilesError);
      return [];
    }
    if (!profiles?.length) return [];

    const { data: listed, error: listError } = await admin.auth.admin.listUsers({
      perPage: 200,
    });
    if (listError) {
      console.error("listLoginCandidates users", listError);
      return [];
    }

    const emailById = new Map(
      listed.users.map((u) => [u.id, u.email ?? ""] as const),
    );

    return profiles
      .map((p) => ({
        id: p.id,
        email: emailById.get(p.id) ?? "",
        full_name: p.full_name as string,
        role: p.role as string,
      }))
      .filter((p) => p.email);
  } catch (e) {
    console.error("listLoginCandidates", e);
    return [];
  }
}

export async function loginAs(userId: string) {
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, is_active")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.is_active) {
    return { error: "Compte introuvable ou inactif." };
  }

  const { data: authUser, error: userError } =
    await admin.auth.admin.getUserById(userId);
  if (userError || !authUser.user.email) {
    return { error: "Impossible de retrouver l'email de ce compte." };
  }

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: authUser.user.email,
    });

  if (linkError || !linkData.properties?.hashed_token) {
    return { error: "Connexion impossible pour le moment. Réessaie." };
  }

  const supabase = createServerSupabase();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: linkData.properties.hashed_token,
  });

  if (verifyError) {
    return { error: `Session non créée : ${verifyError.message}` };
  }

  return { ok: true as const };
}
