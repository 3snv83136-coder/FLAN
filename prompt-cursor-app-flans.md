# PROMPT CURSOR — Application de vente de flans

## 🎯 Objectif
- Créer une application web de gestion pour une activité de vente de flans (recettes + points de vente + stocks).
- Stack : **Next.js 14 (App Router)** + **TypeScript** + **Tailwind** + **shadcn/ui**, base de données **PostgreSQL via Supabase** (auth incluse).

## 👤 Rôles / Authentification
- **Admin** : accès total (recettes, magasins, stocks, ventes, utilisateurs).
- **Manager de magasin** : gère son magasin, ses stocks et ses ventes.
- **Employé** : consulte les recettes et enregistre les ventes / sorties de stock.

## 🍮 Module Recettes
- CRUD complet des recettes de flan (nom, photo, catégorie, temps de prépa, difficulté, prix de vente conseillé).
- Liste d'ingrédients par recette avec quantité + unité (g, ml, pièce).
- Calcul automatique du **coût de revient** à partir du prix des matières premières.
- Calcul de la **marge** (prix de vente – coût de revient).
- Recherche et filtres (catégorie, allergènes, coût).

## 🏪 Module Magasins
- CRUD des magasins (nom, adresse, téléphone, horaires, responsable).
- Vue carte ou liste des points de vente.
- Chaque magasin a son propre stock et ses propres ventes.

## 📦 Module Stocks
- Gestion des matières premières (ingrédients) et des produits finis (flans) par magasin.
- Entrées de stock (réception, production) et sorties (vente, perte, casse).
- **Seuils d'alerte** : notification quand un ingrédient / produit passe sous le seuil minimum.
- **Décrémentation automatique** des ingrédients quand une production de flan est enregistrée.
- Historique des mouvements de stock (qui, quoi, quand, combien).

## 💶 Module Ventes
- Enregistrement d'une vente (magasin, produit, quantité, prix, date).
- Décrémentation automatique du stock de produits finis.
- Tableau de bord : CA par jour / magasin, produits les plus vendus, marge globale.

## 📊 Dashboard
- Vue synthétique : stock critique, ventes du jour, top recettes, marge moyenne.
- Filtres par magasin et par période.

## 🗄️ Modèle de données (tables principales)
- `recipes`
- `ingredients`
- `recipe_ingredients` (table de liaison)
- `stores`
- `stock_items`
- `stock_movements`
- `sales`
- `users`

## ✅ Exigences techniques
- Code TypeScript typé, composants réutilisables, formulaires validés (**Zod**).
- Responsive (mobile + desktop, usage terrain).
- Seed de démo : 5 recettes de flan, 2 magasins, quelques stocks et ventes.

## 📌 Livrables attendus
- Schéma de base de données (migrations Supabase).
- Interfaces CRUD complètes pour chaque module.
- Dashboard fonctionnel avec les données du seed.
