"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_PHOTOS_BUCKET } from "@/lib/storage/site-photos";
import type { PosType } from "@/types/database";

const POS_TYPES: PosType[] = ["boutique", "marche", "stand", "autre"];
const PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

async function requireGerant() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non connecté." as const, supabase: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "gerant") {
    return { error: "Réservé au gérant." as const, supabase: null };
  }
  return { error: null, supabase };
}

function eurosToCents(raw: string): number | null {
  const n = Number(String(raw).replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

async function uploadSitePhoto(
  folder: string,
  id: string,
  file: File,
  previousPath: string | null,
): Promise<{ path: string } | { error: string }> {
  if (!PHOTO_TYPES.has(file.type) && !file.type.startsWith("image/")) {
    return { error: "Envoie une photo (jpeg, png, webp)." };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { error: "Photo trop lourde (max 8 Mo)." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${id}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from(SITE_PHOTOS_BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
  if (uploadError) return { error: uploadError.message };

  if (previousPath) {
    await admin.storage.from(SITE_PHOTOS_BUCKET).remove([previousPath]);
  }
  return { path };
}

export async function createPointOfSale(formData: FormData) {
  const gate = await requireGerant();
  if (gate.error || !gate.supabase) return { error: gate.error };

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "boutique") as PosType;
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!name) return { error: "Indique le nom du magasin." };
  if (!POS_TYPES.includes(type)) return { error: "Type de magasin invalide." };

  const { data: created, error } = await gate.supabase
    .from("points_of_sale")
    .insert({ name, type, address, is_active: true })
    .select("id")
    .single();

  if (error || !created) {
    return { error: error?.message ?? "Impossible de créer le magasin." };
  }

  const { data: products } = await gate.supabase.from("products").select("id");
  if (products?.length) {
    await gate.supabase.from("stock_items").insert(
      products.map((p) => ({
        point_of_sale_id: created.id,
        product_id: p.id,
        quantity: 0,
        updated_at: new Date().toISOString(),
      })),
    );
  }

  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadSitePhoto("pos", created.id, file, null);
    if ("error" in uploaded) return { error: uploaded.error };
    const { error: photoError } = await gate.supabase
      .from("points_of_sale")
      .update({ photo_path: uploaded.path })
      .eq("id", created.id);
    if (photoError) return { error: photoError.message };
  }

  revalidatePath("/reglages");
  revalidatePath("/login");
  revalidatePath("/vente");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function updatePointOfSale(formData: FormData) {
  const gate = await requireGerant();
  if (gate.error || !gate.supabase) return { error: gate.error };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "boutique") as PosType;
  const address = String(formData.get("address") ?? "").trim() || null;
  const isActive = formData.get("is_active") === "on";

  if (!id || !name) return { error: "Nom du magasin manquant." };
  if (!POS_TYPES.includes(type)) return { error: "Type de magasin invalide." };

  const { data: current } = await gate.supabase
    .from("points_of_sale")
    .select("photo_path")
    .eq("id", id)
    .single();

  let photoPath = (current?.photo_path as string | null) ?? null;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadSitePhoto("pos", id, file, photoPath);
    if ("error" in uploaded) return { error: uploaded.error };
    photoPath = uploaded.path;
  }

  const { error } = await gate.supabase
    .from("points_of_sale")
    .update({
      name,
      type,
      address,
      is_active: isActive,
      photo_path: photoPath,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/reglages");
  revalidatePath("/login");
  revalidatePath("/vente");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function createProduct(formData: FormData) {
  const gate = await requireGerant();
  if (gate.error || !gate.supabase) return { error: gate.error };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const priceCents = eurosToCents(String(formData.get("price_euros") ?? ""));

  if (!name) return { error: "Indique le nom du flan." };
  if (priceCents == null) return { error: "Prix invalide." };

  const { data: created, error } = await gate.supabase
    .from("products")
    .insert({
      name,
      description,
      price_cents: priceCents,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: error?.message ?? "Impossible de créer le produit." };
  }

  const { data: posList } = await gate.supabase
    .from("points_of_sale")
    .select("id")
    .eq("is_active", true);
  if (posList?.length) {
    await gate.supabase.from("stock_items").insert(
      posList.map((pos) => ({
        point_of_sale_id: pos.id,
        product_id: created.id,
        quantity: 0,
        updated_at: new Date().toISOString(),
      })),
    );
  }

  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadSitePhoto("products", created.id, file, null);
    if ("error" in uploaded) return { error: uploaded.error };
    const { error: photoError } = await gate.supabase
      .from("products")
      .update({ photo_path: uploaded.path })
      .eq("id", created.id);
    if (photoError) return { error: photoError.message };
  }

  revalidatePath("/reglages");
  revalidatePath("/vente");
  return { ok: true as const };
}

export async function updateProduct(formData: FormData) {
  const gate = await requireGerant();
  if (gate.error || !gate.supabase) return { error: gate.error };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const priceCents = eurosToCents(String(formData.get("price_euros") ?? ""));
  const isActive = formData.get("is_active") === "on";

  if (!id || !name) return { error: "Nom du produit manquant." };
  if (priceCents == null) return { error: "Prix invalide." };

  const { data: current } = await gate.supabase
    .from("products")
    .select("photo_path")
    .eq("id", id)
    .single();

  let photoPath = (current?.photo_path as string | null) ?? null;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadSitePhoto("products", id, file, photoPath);
    if ("error" in uploaded) return { error: uploaded.error };
    photoPath = uploaded.path;
  }

  const { error } = await gate.supabase
    .from("products")
    .update({
      name,
      description,
      price_cents: priceCents,
      is_active: isActive,
      photo_path: photoPath,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/reglages");
  revalidatePath("/vente");
  return { ok: true as const };
}
