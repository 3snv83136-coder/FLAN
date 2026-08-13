# feature-backlog.md — Périmètre v1 & parking lot

> Tu as dit « tout » côté fonctions. C'est un ERP artisanal complet. Pour éviter 3 mois sans rien de fonctionnel, on découpe en **phases**. On ne passe à la phase suivante que quand la précédente tourne.

## Phases (ordre de construction)

### Phase 0 — Fondations
- [x] Projet Next.js + structure Vercel prête (connecter repo GitHub → Vercel à la main)
- [x] Schéma DB depuis `data-dictionary.md` (tables, enums, FK)
- [x] Auth Supabase + table `profiles` + rôles + RLS de base
- [x] Seed : quelques `products`, `points_of_sale`, comptes de test par rôle

### Phase 1 — La boucle de vente (LE cœur, à soigner)
- [x] Écran vendeur **Vente** : grille produits, panier, total, mode de règlement, enregistrement
- [x] **Offline-first** : file locale + synchro `sales`/`sale_items`
- [x] `stock_items` par PDV : la vente décrémente le stock du PDV
- [x] Écran vendeur **Mon stock** (lecture + alertes DLC)
- [x] Dashboard gérant minimal : ventes du jour + CA par PDV

### Phase 1b — Agenda & fabrication (ajout validé)
- [x] UI fond bleu + containers colorés
- [x] `agenda_items` : agenda par salarié
- [x] `fabrication_plans` : plan pâtissier demain depuis invendus veille
- [x] Container Agenda gérant : nommer un salarié, contrat CDD/CDI/alternance, scan documents, jours travaillés, pointage interne début/fin
- [x] Planning semaine / mois généré selon contraintes de chacun (`work_weekdays`, horaires, plafond heures)

### Phase 1c — Spec Comptoir (F2 PIN caisse)
- [x] PIN caisse 4–6 chiffres hashé (`caisse_pin_hash`) : ouverture tablette sur le PDV du vendeur

- [ ] CRUD `ingredients` (+ coût, stock, seuil bas)
- [ ] CRUD `recipes` + `recipe_ingredients`
- [ ] Calcul du **coût matière** par produit
- [ ] Lancer un `production_batch` → décrémente `ingredients.stock_quantity`, alimente le stock central, pose la DLC

### Phase 3 — Logistique multi-PDV
- [ ] `transfers` : préparer/envoyer depuis la production
- [ ] Réception côté vendeur (`status = recu`) → déplace le stock
- [ ] Alertes rupture / surplus par PDV
- [ ] `losses` : déclaration de pertes (péremption, invendus…)

### Phase 4 — Pilotage gérant
- [ ] Dashboard complet : CA par PDV/produit, marge (prix − coût matière), pertes
- [ ] Réglages : produits, prix, PDV, comptes/rôles
- [ ] Alertes DLC & stock bas consolidées

## Parking lot (v2+, PAS en v1)
- Paiement CB **intégré** dans l'app + réconciliation avec le terminal
- Impression de **tickets** (imprimante thermique)
- **Mails / SMS** d'alerte (stock bas, DLC, récap de vente au gérant)
- **Export comptable** / vers tableur / logiciel de compta
- App ou espace **client final** (précommande, fidélité)
- Prévision de production (suggérer les quantités à fabriquer selon l'historique)
- Multi-produits non-flan / autres gammes
- Gestion des fournisseurs & réappro automatique des matières premières

## Idées à trancher plus tard
- Faut-il tracer le **lot précis** vendu (traçabilité DLC fine) ou juste le produit ? (le schéma le permet via `stock_items.batch_id`, mais ça alourdit la caisse — à évaluer.)
- Un vendeur peut-il vendre à cheval sur **plusieurs PDV** dans la même journée ? (v1 : non, 1 vendeur = 1 PDV.)
