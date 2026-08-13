# CLAUDE.md — Manuel d'instructions pour Claude Code

> Projet : **App de gestion production + vente de flan** (multi-points de vente).
> Ce fichier est lu à chaque session. Respecte-le à la lettre.

---

## 1. Ce qu'on construit (résumé)

Une app interne pour un producteur-vendeur de flans qui **fabrique** (recettes, lots, stock de matières premières) et **vend** sur **plusieurs points de vente** (PDV). ~10 utilisateurs répartis en 3 rôles. Le geste le plus fréquent et le plus critique est **l'enregistrement d'une vente par un vendeur, sur tablette, potentiellement hors-ligne**.

Détails complets : voir `app-spec.md`. Périmètre v1 vs plus tard : voir `feature-backlog.md`.
Spec Comptoir (salariés, caisse, objectifs, consommables) : `docs/SPEC-COMPTOIR/README.md`.

## 2. Stack imposée

- **Next.js** (App Router) + **TypeScript**
- **Supabase** (Postgres + Auth + RLS + Storage)
- **Vercel** (déploiement) — **GitHub** (versioning)
- Build assisté dans **Claude Code**
- Aucune autre dépendance externe en v1 (voir `integrations.md`). **Demander avant d'ajouter une lib.**

## 3. Règles ABSOLUES (non négociables)

1. **⚠️ Toujours vérifier `data-dictionary.md` AVANT de nommer un nouveau champ ou une nouvelle table.** Si le nom existe déjà, on le réutilise. S'il n'existe pas, on l'**ajoute d'abord au dictionnaire** (avec son type et sa description), puis on code. Jamais l'inverse.
2. **snake_case partout** : tables, colonnes, enums, clés de fonction SQL. Pas de camelCase en base. (Côté TS, le mapping se fait à la frontière.)
3. **Ne jamais inventer une entité ou un champ hors du dictionnaire.** En cas de besoin non prévu : on s'arrête, on propose l'ajout au dictionnaire, on attend validation.
4. **Toute erreur / bug non trivial rencontré se consigne dans `errors-log.md`** (une ligne : contexte, cause, correctif, prévention). C'est ce qui nous évite de recasser deux fois la même chose.
5. **Argent = entiers en centimes** (`*_cents`). Jamais de float pour un prix ou un total.
6. **Dates/heures = `timestamptz` en UTC.** L'affichage local se gère côté client.
7. **RLS activée sur CHAQUE table.** Aucune table sans policy. Les policies respectent les rôles (voir §5).
8. **L'écran vendeur est offline-first.** Une vente doit pouvoir être saisie sans réseau, mise en file, puis synchronisée. Ne jamais rendre la saisie de vente dépendante d'un appel réseau bloquant.
9. **Ne pas construire un item du backlog sans validation.** Le scope v1 est dans `feature-backlog.md`. Si une demande sort du v1, le signaler.

## 4. Conventions de code

- Composants React fonctionnels, hooks. Server Components par défaut, Client Components seulement si interaction.
- Requêtes DB via le client Supabase typé (générer les types depuis le schéma : `supabase gen types`).
- Nommage fichiers : `kebab-case.tsx`. Nommage variables/fonctions TS : `camelCase`. Nommage DB : `snake_case`.
- Montants affichés : formater en euros à l'affichage uniquement ; stocker en `_cents`.
- Chaque table a `id uuid default gen_random_uuid()`, `created_at timestamptz default now()`.

## 5. Rôles (à respecter dans chaque policy et chaque écran)

- **vendeur** → rattaché à UN point de vente. Peut : enregistrer des ventes, voir le stock de SON PDV, déclarer des pertes sur son PDV. Ne voit PAS le CA global ni les autres PDV.
- **producteur** → gère recettes, lots de production, stock de matières premières, et prépare/envoie les transferts vers les PDV. Ne touche pas à la caisse.
- **gerant** → accès total : tous les PDV, CA global, gestion des comptes et des produits.

## 6. Ordre de construction

Suivre la séquence de `feature-backlog.md` (section « Phases »). Ne pas sauter à la production/recettes tant que la boucle de vente (auth + PDV + produits + vente offline + stock PDV + dashboard) ne tourne pas.

## 7. Ambiance produit

Mot d'ordre : **rapide**. Écran vendeur = gros boutons tactiles, 2 taps pour une vente, contraste fort (lisible en extérieur). Détails visuels : `brand-brief.md`.
