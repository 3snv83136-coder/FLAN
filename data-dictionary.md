# data-dictionary.md — Dictionnaire de données

> **Source de vérité unique pour tout nom de table et de champ.**
> Règle d'or (voir `CLAUDE.md`) : on consulte ce fichier AVANT de nommer quoi que ce soit. Un champ absent d'ici n'existe pas tant qu'il n'a pas été ajouté ici.
> Conventions : `snake_case` ; clés primaires `id uuid` ; `created_at timestamptz default now()` sur chaque table ; argent en **centimes entiers** (`*_cents`) ; dates en `timestamptz` UTC.

---

## profiles
Prolonge `auth.users` de Supabase. Un profil par utilisateur (~10).

| champ | type | description |
|---|---|---|
| id | uuid (PK, FK → auth.users) | identifiant utilisateur |
| full_name | text | nom affiché |
| role | enum `user_role` | `vendeur` \| `producteur` \| `gerant` |
| point_of_sale_id | uuid (FK → points_of_sale, nullable) | PDV rattaché (obligatoire pour un vendeur) |
| is_active | boolean (default true) | compte actif |
| created_at | timestamptz | — |

## points_of_sale
Les points de vente (boutique, marché, stand…).

| champ | type | description |
|---|---|---|
| id | uuid (PK) | — |
| name | text | nom du PDV |
| type | enum `pos_type` | `boutique` \| `marche` \| `stand` \| `autre` |
| address | text (nullable) | adresse / emplacement |
| is_active | boolean (default true) | — |
| created_at | timestamptz | — |

## products
Les flans vendables (un par parfum / variante).

| champ | type | description |
|---|---|---|
| id | uuid (PK) | — |
| name | text | nom / parfum du flan |
| description | text (nullable) | — |
| price_cents | integer | prix de vente unitaire en centimes |
| is_active | boolean (default true) | vendable ou non |
| created_at | timestamptz | — |

## ingredients
Matières premières (stock d'ingrédients).

| champ | type | description |
|---|---|---|
| id | uuid (PK) | — |
| name | text | ex. sucre, lait, œufs |
| unit | enum `ingredient_unit` | `g` \| `kg` \| `ml` \| `l` \| `piece` |
| cost_per_unit_cents | integer | coût par unité en centimes (pour le coût matière) |
| stock_quantity | numeric | quantité en stock (dans `unit`) |
| low_stock_threshold | numeric (nullable) | seuil d'alerte stock bas |
| created_at | timestamptz | — |

## recipes
Une recette par produit (multi-parfums = multi-recettes).

| champ | type | description |
|---|---|---|
| id | uuid (PK) | — |
| product_id | uuid (FK → products) | produit fabriqué |
| name | text | nom de la recette |
| steps | text (nullable) | étapes de fabrication |
| batch_yield | integer | nombre de flans produits par lot standard |
| created_at | timestamptz | — |

## recipe_ingredients
Table de liaison : quels ingrédients (et combien) pour un `batch_yield` de recette.

| champ | type | description |
|---|---|---|
| id | uuid (PK) | — |
| recipe_id | uuid (FK → recipes) | — |
| ingredient_id | uuid (FK → ingredients) | — |
| quantity | numeric | quantité d'ingrédient pour un lot (`batch_yield`), dans l'`unit` de l'ingrédient |
| created_at | timestamptz | — |

## production_batches
Un lot fabriqué. Son enregistrement **décrémente** le stock d'ingrédients (via `recipe_ingredients`).

| champ | type | description |
|---|---|---|
| id | uuid (PK) | — |
| recipe_id | uuid (FK → recipes) | — |
| product_id | uuid (FK → products) | dénormalisé pour requêtes rapides |
| produced_by | uuid (FK → profiles) | le producteur |
| quantity_produced | integer | nb de flans produits |
| produced_at | timestamptz | — |
| expiry_date | date | DLC du lot |
| status | enum `batch_status` | `en_stock` \| `epuise` \| `perime` |
| created_at | timestamptz | — |

## stock_items
Stock de **produits finis** par emplacement. `point_of_sale_id` nul = stock central / production.

| champ | type | description |
|---|---|---|
| id | uuid (PK) | — |
| point_of_sale_id | uuid (FK → points_of_sale, nullable) | emplacement (nul = central) |
| product_id | uuid (FK → products) | — |
| batch_id | uuid (FK → production_batches, nullable) | lot d'origine (pour la DLC) |
| quantity | integer | quantité disponible |
| updated_at | timestamptz | — |

## transfers
Envoi de flans (production → PDV, ou PDV → PDV). Suivi envoyé/reçu.

| champ | type | description |
|---|---|---|
| id | uuid (PK) | — |
| product_id | uuid (FK → products) | — |
| batch_id | uuid (FK → production_batches, nullable) | — |
| quantity | integer | nb de flans transférés |
| from_point_of_sale_id | uuid (FK → points_of_sale, nullable) | origine (nul = production/central) |
| to_point_of_sale_id | uuid (FK → points_of_sale) | destination |
| status | enum `transfer_status` | `envoye` \| `recu` \| `annule` |
| sent_by | uuid (FK → profiles) | — |
| sent_at | timestamptz | — |
| received_by | uuid (FK → profiles, nullable) | — |
| received_at | timestamptz (nullable) | — |

## sales
Une vente (en-tête). Créée par un vendeur sur un PDV. Compatible saisie hors-ligne.

| champ | type | description |
|---|---|---|
| id | uuid (PK) | généré côté client pour l'offline |
| point_of_sale_id | uuid (FK → points_of_sale) | — |
| sold_by | uuid (FK → profiles) | le vendeur |
| total_cents | integer | total de la vente en centimes |
| payment_method | enum `payment_method` | `especes` \| `cb` (CB encaissée sur terminal séparé) |
| sold_at | timestamptz | horodatage réel de la vente (peut précéder la sync) |
| synced_at | timestamptz (nullable) | quand la vente a été synchronisée au serveur |
| created_at | timestamptz | — |

## sale_items
Lignes d'une vente.

| champ | type | description |
|---|---|---|
| id | uuid (PK) | — |
| sale_id | uuid (FK → sales) | — |
| product_id | uuid (FK → products) | — |
| quantity | integer | nb d'unités |
| unit_price_cents | integer | prix unitaire au moment de la vente (figé) |

## losses
Pertes / invendus / DLC dépassée.

| champ | type | description |
|---|---|---|
| id | uuid (PK) | — |
| point_of_sale_id | uuid (FK → points_of_sale, nullable) | où (nul = central) |
| product_id | uuid (FK → products) | — |
| batch_id | uuid (FK → production_batches, nullable) | — |
| quantity | integer | nb de flans perdus |
| reason | enum `loss_reason` | `perime` \| `casse` \| `invendu` \| `autre` |
| recorded_by | uuid (FK → profiles) | — |
| recorded_at | timestamptz | — |

## agenda_items
Événements d'agenda par salarié (planning du jour / de la semaine).

| champ | type | description |
|---|---|---|
| id | uuid (PK) | — |
| profile_id | uuid (FK → profiles) | le salarié concerné |
| title | text | ex. « Marché Bastille », « Production » |
| notes | text (nullable) | détail libre |
| starts_at | timestamptz | début |
| ends_at | timestamptz (nullable) | fin |
| created_at | timestamptz | — |

## fabrication_plans
Plan de fabrication pour le pâtissier (`producteur`) : quantités à faire pour une date (souvent demain), calées sur les invendus de la veille.

| champ | type | description |
|---|---|---|
| id | uuid (PK) | — |
| product_id | uuid (FK → products) | flan à fabriquer |
| for_date | date | jour de fabrication cible |
| quantity_suggested | integer | suggestion depuis invendus veille (`losses.reason = invendu`) |
| quantity_planned | integer | quantité validée / à produire |
| based_on_loss_date | date | date des invendus utilisés pour la suggestion |
| status | enum `fabrication_status` | `a_faire` \| `fait` \| `annule` |
| created_by | uuid (FK → profiles) | — |
| created_at | timestamptz | — |

---

## Enums

- `user_role` : `vendeur`, `producteur`, `gerant`
- `pos_type` : `boutique`, `marche`, `stand`, `autre`
- `ingredient_unit` : `g`, `kg`, `ml`, `l`, `piece`
- `batch_status` : `en_stock`, `epuise`, `perime`
- `transfer_status` : `envoye`, `recu`, `annule`
- `payment_method` : `especes`, `cb`
- `loss_reason` : `perime`, `casse`, `invendu`, `autre`
- `fabrication_status` : `a_faire`, `fait`, `annule`

## Notes de cohérence
- Une **vente** décrémente `stock_items` du PDV concerné.
- Un **transfert reçu** (`status = recu`) déplace la quantité entre `stock_items` (origine → destination).
- Un **lot** décrémente `ingredients.stock_quantity` et alimente `stock_items` (central).
- Une **perte** décrémente `stock_items`.
- Le **coût matière** d'un produit = somme(`recipe_ingredients.quantity` × `ingredients.cost_per_unit_cents`) ÷ `batch_yield`.
- Un **plan de fabrication** pour `for_date` s'appuie sur les `losses` (`reason = invendu`) du `based_on_loss_date` (veille).
