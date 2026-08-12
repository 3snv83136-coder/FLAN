/**
 * Seed de démo pour l'application "flans".
 *
 * Utilisation:
 *  - Copier .env.example -> .env.local (dans flans-app)
 *  - Renseigner SUPABASE_SERVICE_ROLE_KEY
 *  - Exécuter:
 *      node supabase/scripts/seed-flans.mjs
 *
 * Note: le seed utilise la "service role key" pour bypasser les RLS.
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL manquant");
if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant");

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const uuid = () => crypto.randomUUID();

function money(n) {
  return Math.round(n * 100) / 100;
}

console.log("[seed-flans] démarrage...");

const store1 = { id: uuid(), name: "Magasin Hyères", address: "Hyères (83)", phone: "0000000001", hours: "Lun-Sam 08:00-19:00" };
const store2 = { id: uuid(), name: "Magasin Toulon", address: "Toulon (83)", phone: "0000000002", hours: "Lun-Sam 08:00-19:00" };

const ingredients = [
  { id: uuid(), name: "Farine", unit: "g", unit_price: money(0.004), min_threshold: 500 },
  { id: uuid(), name: "Lait", unit: "ml", unit_price: money(0.0012), min_threshold: 2000 },
  { id: uuid(), name: "Oeufs", unit: "piece", unit_price: 0.28, min_threshold: 50 },
  { id: uuid(), name: "Sucre", unit: "g", unit_price: money(0.007), min_threshold: 400 },
  { id: uuid(), name: "Chocolat", unit: "g", unit_price: money(0.02), min_threshold: 200 },
];

const recipes = [
  { id: uuid(), name: "Flan Vanille", category: "Classique", prep_time_minutes: 45, difficulty: "facile", suggested_price: money(3.5), allergens: ["œufs","lait"] },
  { id: uuid(), name: "Flan Chocolat", category: "Classique", prep_time_minutes: 50, difficulty: "moyen", suggested_price: money(4.0), allergens: ["œufs","lait"] },
  { id: uuid(), name: "Flan Caramel", category: "Classique", prep_time_minutes: 55, difficulty: "moyen", suggested_price: money(4.2), allergens: ["œufs","lait"] },
  { id: uuid(), name: "Flan Café", category: "Gourmand", prep_time_minutes: 50, difficulty: "moyen", suggested_price: money(4.3), allergens: ["œufs","lait"] },
  { id: uuid(), name: "Flan Citron", category: "Frais", prep_time_minutes: 45, difficulty: "facile", suggested_price: money(4.1), allergens: ["œufs","lait"] },
];

// Composition (quantités = "par 1 flan", unité = celle de l'ingrédient)
const recipeIngredients = [
  // Vanille
  { recipeName: "Flan Vanille", ingredientName: "Farine", quantity: 40 },
  { recipeName: "Flan Vanille", ingredientName: "Lait", quantity: 250 },
  { recipeName: "Flan Vanille", ingredientName: "Oeufs", quantity: 1 },
  { recipeName: "Flan Vanille", ingredientName: "Sucre", quantity: 25 },

  // Chocolat
  { recipeName: "Flan Chocolat", ingredientName: "Farine", quantity: 40 },
  { recipeName: "Flan Chocolat", ingredientName: "Lait", quantity: 250 },
  { recipeName: "Flan Chocolat", ingredientName: "Oeufs", quantity: 1 },
  { recipeName: "Flan Chocolat", ingredientName: "Sucre", quantity: 20 },
  { recipeName: "Flan Chocolat", ingredientName: "Chocolat", quantity: 15 },

  // Caramel (on réutilise Chocolat comme "caramel" pour démo)
  { recipeName: "Flan Caramel", ingredientName: "Farine", quantity: 40 },
  { recipeName: "Flan Caramel", ingredientName: "Lait", quantity: 250 },
  { recipeName: "Flan Caramel", ingredientName: "Oeufs", quantity: 1 },
  { recipeName: "Flan Caramel", ingredientName: "Sucre", quantity: 22 },
  { recipeName: "Flan Caramel", ingredientName: "Chocolat", quantity: 10 },

  // Café (réutilise Chocolat)
  { recipeName: "Flan Café", ingredientName: "Farine", quantity: 40 },
  { recipeName: "Flan Café", ingredientName: "Lait", quantity: 250 },
  { recipeName: "Flan Café", ingredientName: "Oeufs", quantity: 1 },
  { recipeName: "Flan Café", ingredientName: "Sucre", quantity: 24 },
  { recipeName: "Flan Café", ingredientName: "Chocolat", quantity: 8 },

  // Citron (réutilise Chocolat)
  { recipeName: "Flan Citron", ingredientName: "Farine", quantity: 40 },
  { recipeName: "Flan Citron", ingredientName: "Lait", quantity: 250 },
  { recipeName: "Flan Citron", ingredientName: "Oeufs", quantity: 1 },
  { recipeName: "Flan Citron", ingredientName: "Sucre", quantity: 26 },
  { recipeName: "Flan Citron", ingredientName: "Chocolat", quantity: 6 },
];

const allStores = [store1, store2];

await sb.from("stores").insert(allStores);
await sb.from("ingredients").insert(ingredients);
await sb.from("recipes").insert(recipes);

// Ajout recipe_ingredients
const getIngredientId = (name) => ingredients.find((i) => i.name === name).id;
const getRecipeId = (name) => recipes.find((r) => r.name === name).id;

await sb.from("recipe_ingredients").insert(
  recipeIngredients.map((ri) => ({
    recipe_id: getRecipeId(ri.recipeName),
    ingredient_id: getIngredientId(ri.ingredientName),
    quantity: ri.quantity,
  })),
);

// Initialiser stock_items
const stockItems = [];
for (const s of allStores) {
  for (const ing of ingredients) {
    stockItems.push({
      id: uuid(),
      store_id: s.id,
      kind: "ingredient",
      ingredient_id: ing.id,
      recipe_id: null,
      quantity: ing.min_threshold + 500, // démo
      min_threshold: ing.min_threshold,
    });
  }

  for (const r of recipes) {
    stockItems.push({
      id: uuid(),
      store_id: s.id,
      kind: "product",
      ingredient_id: null,
      recipe_id: r.id,
      quantity: 0,
      min_threshold: 10,
    });
  }
}

await sb.from("stock_items").insert(stockItems);

const getStockItem = ({ storeId, kind, ingredientId, recipeId }) =>
  stockItems.find(
    (si) =>
      si.store_id === storeId &&
      si.kind === kind &&
      (kind === "ingredient" ? si.ingredient_id === ingredientId : si.recipe_id === recipeId),
  ).id;

// Production + ventes (exemple)
for (const s of allStores) {
  const productRecipe = recipes[0]; // Vanille
  const productStockItemId = getStockItem({ storeId: s.id, kind: "product", recipeId: productRecipe.id });
  const productionQty = 20;

  // Production: déclenche la décrémentation des ingrédients via trigger
  await sb.from("stock_movements").insert({
    store_id: s.id,
    stock_item_id: productStockItemId,
    movement_type: "PRODUCTION",
    quantity: productionQty,
    note: "Production démo",
    created_by: null,
  });

  // Vente: décrément produit fini
  const saleQty = 7;
  await sb.from("stock_movements").insert({
    store_id: s.id,
    stock_item_id: productStockItemId,
    movement_type: "SALE",
    quantity: saleQty,
    note: "Vente démo",
    created_by: null,
  });

  await sb.from("sales").insert({
    store_id: s.id,
    recipe_id: productRecipe.id,
    quantity: saleQty,
    unit_price: money(productRecipe.suggested_price),
    sold_at: new Date().toISOString(),
    created_by: null,
  });
}

console.log("[seed-flans] terminé ✅");

