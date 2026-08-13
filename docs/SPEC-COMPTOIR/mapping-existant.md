# Mapping spec Comptoir → dictionnaire FLAN existant

> Source de vérité DB : `data-dictionary.md` à la racine. On **réutilise** ces noms. On n’invente rien ici.

| Spec (Prisma / FR) | Déjà en base (snake_case) | Notes |
|---|---|---|
| `Magasin` | `points_of_sale` | `name`, `type`, `address`, `is_active` |
| `Produit` | `products` | `price_cents` (pas de Decimal) |
| `Salarie` | `profiles` | `full_name`, `role`, `contract_type`, `work_weekdays` |
| `SalarieDocument` | `employee_documents` | bucket `employee_documents` ; kinds actuels : `contrat` / `autre` |
| `Vente` | `sales` | `total_cents`, `payment_method`, `sold_at`, `synced_at` ; `id` client = offline |
| `LigneVente` | `sale_items` | `unit_price_cents`, `quantity` |
| `StockProduit` / `StockProduitJour` | `stock_items` | par PDV + produit (+ `batch_id` DLC) — **pas encore** « un stock par jour » |
| `Affectation` | `profiles.point_of_sale_id` | **1 vendeur = 1 PDV** en v1 actuelle |
| PIN caisse `codeCaisse` | `profiles.caisse_pin_hash` | hash bcrypt ; login tablette = magasin + PIN 4–6 chiffres |
| `Objectif` | — | **absent** du dictionnaire |
| `Promotion` | — | **absent** |
| `Consommable` / `StockConsommable` | `ingredients` (atelier) | matières premières ≠ packaging/serviettes magasin |
| Rôle `Logistique` | — | rôles actuels : `vendeur` \| `producteur` \| `gerant` |
| Recettes / lots / transferts | `recipes`, `production_batches`, `transfers`, `losses` | déjà dans le dictionnaire, hors spec Comptoir §F1–F6 |

## Déjà livré dans l’app (à ne pas recoder)

- Auth sans mot de passe, écran vente offline, stock PDV, dashboard CA jour
- Agenda salariés + planning semaine/mois + pointage interne
- Plan fabrication demain depuis invendus
