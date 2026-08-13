# app-spec.md — Spécification de l'app

## En une phrase
App qui gère la **production** de flans (recettes, lots, stock de matières premières) et leur **vente** (caisse, stock, clients internes) sur **plusieurs points de vente**, au même endroit.

## Pour qui
Un **producteur-vendeur** de flans en **multi-points de vente**, avec une équipe d'environ **10 personnes** réparties en 3 rôles.

### Persona principal — le vendeur
Sur un stand ou en boutique, tablette en main, il enregistre des ventes toute la journée, souvent dans le rush, parfois **sans réseau fiable**. Il veut : taper une vente en 2 secondes, voir combien de flans il lui reste, ne jamais perdre une vente à cause d'un bug ou d'un chargement. C'est **son** écran qu'on soigne en premier.

### Les autres rôles
- **Producteur** : fabrique. Gère recettes, lance des lots (ce qui consomme les matières premières), prépare les envois vers les PDV.
- **Gérant** (le patron) : voit tout. CA global, performance par PDV, gestion des produits, des comptes et des prix.

## Le problème résolu
Deux douleurs, aux deux bouts de la chaîne :
1. **Recettes** : ne pas savoir ce que coûte réellement un flan, ni combien de matières premières un lot va consommer, ni gérer proprement plusieurs parfums.
2. **Logistique** : ne pas savoir quoi envoyer où, ne pas suivre les transferts entre production et PDV, subir ruptures/surplus par point de vente, et gérer les pertes/DLC d'un produit périssable.

## Rôles & permissions
| | vendeur | producteur | gerant |
|---|---|---|---|
| Enregistrer une vente | ✅ (son PDV) | — | ✅ |
| Voir stock de son PDV | ✅ | ✅ | ✅ |
| Voir tous les PDV / CA global | — | — | ✅ |
| Gérer recettes & ingrédients | — | ✅ | ✅ |
| Lancer un lot de production | — | ✅ | ✅ |
| Préparer/envoyer un transfert | — | ✅ | ✅ |
| Réceptionner un transfert | ✅ (son PDV) | ✅ | ✅ |
| Déclarer une perte | ✅ (son PDV) | ✅ | ✅ |
| Gérer produits, prix, comptes | — | — | ✅ |

Implémenté via **Supabase Auth + RLS**. Chaque table a ses policies (voir `CLAUDE.md` §3.7).

## Contraintes fortes
- **Offline-first sur la vente** : saisie possible sans réseau, file d'attente locale, synchronisation dès que le réseau revient. `id` de vente généré côté client.
- **Tablette d'abord** : layout tactile, gros boutons, lisible en extérieur.
- **Argent en centimes**, dates en UTC.
- **Terminal CB séparé** : l'app n'encaisse pas la CB, elle enregistre le montant et le mode de règlement (`especes` / `cb`).

## Écrans / pages (v1)
1. **Connexion** (Supabase Auth).
2. **Écran vendeur — Vente** : grille de produits (gros boutons), panier, total, choix mode de règlement, bouton « Enregistrer ». Fonctionne hors-ligne.
3. **Écran vendeur — Mon stock** : ce qu'il reste sur SON PDV, alertes DLC.
4. **Réception de transfert** : valider les flans reçus sur son PDV.
5. **Déclarer une perte** : produit + quantité + raison.
6. **Producteur — Recettes & ingrédients** : CRUD recettes, ingrédients, coût matière calculé.
7. **Producteur — Lancer un lot** : choisir recette + quantité → décrémente les matières, crée le lot, alimente le stock central.
8. **Producteur — Transferts** : répartir/envoyer vers les PDV, suivre envoyé/reçu.
9. **Gérant — Dashboard** : CA par PDV et global, ventes du jour, stock global, alertes (ruptures, DLC).
10. **Gérant — Réglages** : produits, prix, PDV, comptes/rôles.

Le détail du séquencement (ce qui se code en premier) est dans `feature-backlog.md`.

## Hors périmètre v1
Voir `feature-backlog.md` → « Parking lot ». En résumé : paiement CB intégré, impression de tickets, mails/SMS d'alerte, export comptable, appli client final, fidélité.
