# Écarts spec Comptoir vs règles du repo — à trancher

La spec `SPEC.md` décrit un **brouillon Prisma**. Le repo impose autre chose (`CLAUDE.md`). Tant que ce n’est pas tranché, **on ne code pas** ces items.

| Sujet | Spec Comptoir | Règle repo actuelle | Proposition |
|---|---|---|---|
| ORM | Prisma | SQL Supabase + client typé | **Garder Supabase**, pas Prisma |
| Argent | `Decimal` | entiers `*_cents` | **centimes** |
| IDs | `cuid()` | `uuid` | **uuid** |
| Mails d’alerte | Resend | aucune lib externe v1 | rester **in-app** jusqu’à validation |
| PIN caisse | code 4–6 chiffres | tap nom / session | **validé** : `caisse_pin_hash` + ouverture caisse tablette |
| Multi-magasins / salarié | table `Affectation` | 1 vendeur = 1 PDV | à valider avant d’ajouter une table |
| Stock produit **par jour** | `StockProduitJour` | `stock_items` roulant | à valider (réinit matin vs stock continu) |
| Rôle logistique | oui | 3 rôles | ajouter `user_role` seulement après validation dictionnaire |
| Documents identité / Vitale / permis | `PERMIS`, `CARTE_VITALE`, `PIECE_IDENTITE` | `contrat` / `autre` + alerte RGPD | **ne pas stocker Vitale** tant que le juriste n’a pas tranché (§7) |
| Objectifs & promos | F4 | hors backlog phases 0–1 | valider comme phase suivante |
| Consommables magasin | F5 | parking / ingredients atelier | valider table dédiée vs `ingredients` |

Ordre de build **déjà fait** dans le repo : fondations + caisse offline + stock + dashboard min. La spec §5 recommence au schéma : on **enchaîne** à partir du mapping, on ne repart pas de zéro.
