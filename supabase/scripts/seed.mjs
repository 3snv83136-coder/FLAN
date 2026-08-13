/**
 * Seed Phase 0 — PDV, produits, comptes de test (1 par rôle).
 *
 * Prérequis :
 * 1. Projet Supabase créé
 * 2. Migration `supabase/migrations/0001_init_schema.sql` exécutée
 * 3. `.env.local` rempli (URL + anon + service_role)
 *
 * Usage : npm run seed
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans .env.local",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensurePos() {
  const desired = [
    {
      name: "Boutique Centre",
      type: "boutique",
      address: "12 rue du Flan, Paris",
    },
    {
      name: "Marché Bastille",
      type: "marche",
      address: "Place de la Bastille",
    },
    { name: "Stand Festival", type: "stand", address: null },
  ];

  const { data: existing, error } = await admin
    .from("points_of_sale")
    .select("id, name");
  if (error) throw error;

  const byName = new Map((existing ?? []).map((p) => [p.name, p]));
  for (const pos of desired) {
    if (!byName.has(pos.name)) {
      const { data, error: insertError } = await admin
        .from("points_of_sale")
        .insert(pos)
        .select("id, name")
        .single();
      if (insertError) throw insertError;
      byName.set(data.name, data);
    }
  }

  console.log(`  PDV : ${byName.size}`);
  return byName;
}

async function ensureProducts() {
  const { data: existing, error } = await admin.from("products").select("id");
  if (error) throw error;
  if (existing && existing.length > 0) {
    console.log(`  Produits : ${existing.length} déjà présents`);
    return;
  }

  const { error: insertError } = await admin.from("products").insert([
    { name: "Flan nature", description: "Classique vanille", price_cents: 350 },
    {
      name: "Flan caramel",
      description: "Nappé caramel maison",
      price_cents: 400,
    },
    { name: "Flan chocolat", description: "Cacao intense", price_cents: 450 },
    { name: "Flan coco", description: "Lait de coco", price_cents: 450 },
  ]);
  if (insertError) throw insertError;
  console.log("  Produits : 4 créés");
}

async function upsertAuthUser(email) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    perPage: 200,
  });
  if (listError) throw listError;

  const existing = listed.users.find((u) => u.email === email);
  if (existing) return existing.id;

  // Pas de mot de passe métier : connexion via choix de compte (magic link serveur).
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

async function ensureAccounts(boutiqueId) {
  const accounts = [
    {
      email: "vendeur@flan.test",
      full_name: "Camille Vendeur",
      role: "vendeur",
      point_of_sale_id: boutiqueId,
    },
    {
      email: "producteur@flan.test",
      full_name: "Alex Producteur",
      role: "producteur",
      point_of_sale_id: null,
    },
    {
      email: "gerant@flan.test",
      full_name: "Sam Gérant",
      role: "gerant",
      point_of_sale_id: null,
    },
  ];

  for (const account of accounts) {
    const userId = await upsertAuthUser(account.email);
    const { error } = await admin.from("profiles").upsert({
      id: userId,
      full_name: account.full_name,
      role: account.role,
      point_of_sale_id: account.point_of_sale_id,
      is_active: true,
    });
    if (error) throw error;
    console.log(`  Compte : ${account.full_name} <${account.email}> (${account.role})`);
  }
}

async function ensureStock(posByName) {
  const boutique = posByName.get("Boutique Centre");
  const marche = posByName.get("Marché Bastille");
  if (!boutique) return;

  const { data: products, error } = await admin
    .from("products")
    .select("id, name");
  if (error) throw error;
  if (!products?.length) return;

  const targets = [
    { pos: boutique, qty: 24 },
    ...(marche ? [{ pos: marche, qty: 12 }] : []),
  ];

  let created = 0;
  for (const { pos, qty } of targets) {
    for (const product of products) {
      const { data: existing } = await admin
        .from("stock_items")
        .select("id")
        .eq("point_of_sale_id", pos.id)
        .eq("product_id", product.id)
        .is("batch_id", null)
        .maybeSingle();

      if (existing) continue;

      const { error: insertError } = await admin.from("stock_items").insert({
        point_of_sale_id: pos.id,
        product_id: product.id,
        batch_id: null,
        quantity: qty,
        updated_at: new Date().toISOString(),
      });
      if (insertError) throw insertError;
      created += 1;
    }
  }
  console.log(`  Stock PDV : ${created} lignes ajoutées (0 si déjà présent)`);
}

async function main() {
  console.log("→ Seed FLAN…");
  const posByName = await ensurePos();
  const boutique = posByName.get("Boutique Centre");
  if (!boutique) throw new Error("PDV Boutique Centre introuvable");

  await ensureProducts();
  await ensureAccounts(boutique.id);
  await ensureStock(posByName);

  console.log("\n✓ Seed terminé. Connexion sans mot de passe : tape ton nom sur /login.");
}

main().catch((err) => {
  console.error("Seed échoué :", err);
  process.exit(1);
});
