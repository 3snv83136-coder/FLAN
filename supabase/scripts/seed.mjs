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

async function ensureCaissePin() {
  const { data: camille, error } = await admin
    .from("profiles")
    .select("id")
    .eq("full_name", "Camille Vendeur")
    .maybeSingle();
  if (error || !camille) {
    console.log("  PIN caisse : Camille introuvable, skip");
    return;
  }

  const { error: pinError } = await admin.rpc("set_caisse_pin", {
    p_profile_id: camille.id,
    p_pin: "1234",
  });
  if (pinError) {
    console.log(
      "  PIN caisse : lance d’abord 0007_caisse_pin.sql —",
      pinError.message,
    );
    return;
  }
  console.log("  PIN caisse Camille : 1234 (Boutique Centre)");
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

function parisYmd(offsetDays) {
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
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

async function ensureAgendaAndLosses(boutiqueId) {
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, role");
  if (!profiles?.length) return;

  const { count: agendaCount } = await admin
    .from("agenda_items")
    .select("id", { count: "exact", head: true });

  if (!agendaCount) {
    const tomorrow = new Date();
    tomorrow.setHours(9, 0, 0, 0);
    const rows = profiles.map((p) => {
      const start = new Date(tomorrow);
      if (p.role === "vendeur") {
        return {
          profile_id: p.id,
          title: "Ouverture Boutique Centre",
          notes: "Caisse + stock matin",
          starts_at: start.toISOString(),
          ends_at: new Date(start.getTime() + 8 * 3600 * 1000).toISOString(),
        };
      }
      if (p.role === "producteur") {
        start.setHours(6, 0, 0, 0);
        return {
          profile_id: p.id,
          title: "Production flans du jour",
          notes: "Selon plan fabrication",
          starts_at: start.toISOString(),
          ends_at: new Date(start.getTime() + 5 * 3600 * 1000).toISOString(),
        };
      }
      start.setHours(10, 0, 0, 0);
      return {
        profile_id: p.id,
        title: "Tour des PDV",
        notes: null,
        starts_at: start.toISOString(),
        ends_at: new Date(start.getTime() + 3 * 3600 * 1000).toISOString(),
      };
    });
    const { error } = await admin.from("agenda_items").insert(rows);
    if (error) throw error;
    console.log(`  Agenda : ${rows.length} événements`);
  } else {
    console.log(`  Agenda : ${agendaCount} déjà présents`);
  }

  const yesterday = parisYmd(-1);
  const tomorrow = parisYmd(1);
  const { data: products } = await admin.from("products").select("id, name");
  const vendeur = profiles.find((p) => p.role === "vendeur");
  const producteur = profiles.find((p) => p.role === "producteur");
  if (!products?.length || !vendeur || !producteur) return;

  const { count: lossCount } = await admin
    .from("losses")
    .select("id", { count: "exact", head: true })
    .eq("reason", "invendu");

  if (!lossCount) {
    const recordedAt = `${yesterday}T20:00:00.000Z`;
    const lossRows = products.slice(0, 3).map((p, i) => ({
      point_of_sale_id: boutiqueId,
      product_id: p.id,
      quantity: 2 + i,
      reason: "invendu",
      recorded_by: vendeur.id,
      recorded_at: recordedAt,
    }));
    const { error } = await admin.from("losses").insert(lossRows);
    if (error) throw error;
    console.log(`  Invendus hier : ${lossRows.length} lignes`);
  }

  const { count: planCount } = await admin
    .from("fabrication_plans")
    .select("id", { count: "exact", head: true })
    .eq("for_date", tomorrow);

  if (!planCount) {
    const { data: losses } = await admin
      .from("losses")
      .select("product_id, quantity, recorded_at")
      .eq("reason", "invendu");

    const byProduct = new Map();
    for (const l of losses ?? []) {
      const day = new Date(l.recorded_at).toISOString().slice(0, 10);
      // approximate: include if date matches yesterday string
      if (!String(l.recorded_at).startsWith(yesterday) && day !== yesterday) {
        // also accept if recorded_at date in Paris — seed uses UTC date string
        if (!String(l.recorded_at).includes(yesterday)) continue;
      }
      byProduct.set(
        l.product_id,
        (byProduct.get(l.product_id) ?? 0) + l.quantity,
      );
    }

    // fallback: all invendus
    if (byProduct.size === 0) {
      for (const l of losses ?? []) {
        byProduct.set(
          l.product_id,
          (byProduct.get(l.product_id) ?? 0) + l.quantity,
        );
      }
    }

    const plans = Array.from(byProduct.entries()).map(([product_id, qty]) => ({
      product_id,
      for_date: tomorrow,
      quantity_suggested: qty,
      quantity_planned: qty,
      based_on_loss_date: yesterday,
      status: "a_faire",
      created_by: producteur.id,
    }));

    if (plans.length) {
      const { error } = await admin.from("fabrication_plans").insert(plans);
      if (error) throw error;
      console.log(`  Fabrication demain : ${plans.length} lignes`);
    }
  } else {
    console.log(`  Fabrication demain : ${planCount} déjà présentes`);
  }
}

async function main() {
  console.log("→ Seed FLAN…");
  const posByName = await ensurePos();
  const boutique = posByName.get("Boutique Centre");
  if (!boutique) throw new Error("PDV Boutique Centre introuvable");

  await ensureProducts();
  await ensureAccounts(boutique.id);
  await ensureCaissePin();
  await ensureStock(posByName);
  await ensureAgendaAndLosses(boutique.id);

  console.log(
    "\n✓ Seed terminé. Caisse : onglet Caisse + PIN Camille 1234. Équipe : tape le nom gérant / pâtissier.",
  );
}

main().catch((err) => {
  console.error("Seed échoué :", err);
  process.exit(1);
});
