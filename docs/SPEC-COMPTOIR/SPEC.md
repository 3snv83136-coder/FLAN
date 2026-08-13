# Le Comptoir des Flancs — Spécification fonctionnelle v1

> Module : **Salariés · Caisse · Stock produit & consommables · Objectifs/Promos · Dashboard super-admin**
> À déposer à la racine du repo (`/docs/SPEC.md`) comme contexte Cursor.

**Dossier Cursor :** `docs/SPEC-COMPTOIR/` (index, mapping vers le dictionnaire, écarts à trancher).
**Stack réelle du repo :** Next.js + Supabase SQL (pas Prisma). Argent en centimes. Voir `CLAUDE.md`.

---

## 0. Contexte & stack

- **Stack** : Next.js 14 (App Router) · TypeScript · Tailwind · Prisma · Supabase (Postgres + Auth + Realtime + Storage) · Vercel · Resend (alertes mail).
- **Écran vendeur** : pensé **tablette d'abord**, doit être **rapide** et **fonctionner hors-ligne** (encaissement même sans réseau, puis synchro).
- **Paiement** : terminal CB séparé. L'app **calcule le total et enregistre la vente + le mode de règlement** (espèces / CB), elle **ne traite pas** le paiement CB elle-même.
- **Multi-magasins** : 6–7 boutiques aujourd'hui, **le nombre peut changer** → les magasins sont des **entités dynamiques en base**, jamais codés en dur.

---

## 1. Rôles & permissions

| Rôle | Accès |
|------|-------|
| **Vendeur** | Ouvre la caisse de SON magasin (via son code), tape les ventes, voit le stock du jour de son magasin. |
| **Producteur** | Voit le reste de stock par magasin (pour planifier la prod du lendemain), gère les lots/stock produit. |
| **Logistique** | Reçoit les alertes de réassort consommables, gère les seuils. |
| **Gérant / Super-admin** | Dashboard temps réel toutes boutiques, objectifs, promos, gestion salariés & magasins. |

Auth : Supabase Auth pour les comptes (gérant, producteur, logistique). Le **vendeur ouvre la caisse via un code PIN salarié** (pas forcément une session Supabase complète — voir §3).

---

## 2. Modèle de données (Prisma — brouillon à affiner)

```prisma
model Magasin {
  id            String   @id @default(cuid())
  nom           String
  adresse       String?
  actif         Boolean  @default(true)
  affectations  Affectation[]
  ventes        Vente[]
  stockProduit  StockProduitJour[]
  stockConso    StockConsommable[]
  objectifs     Objectif[]
  promotions    Promotion[]
  createdAt     DateTime @default(now())
}

model Salarie {
  id            String   @id @default(cuid())
  nom           String
  prenom        String
  email         String?
  telephone     String?
  codeCaisse    String   // PIN hashé (voir §3 sécurité)
  actif         Boolean  @default(true)
  affectations  Affectation[]
  documents     SalarieDocument[]
  ventes        Vente[]
  createdAt     DateTime @default(now())
}

// Un salarié peut travailler dans plusieurs magasins, et changer.
model Affectation {
  id         String   @id @default(cuid())
  salarie    Salarie  @relation(fields: [salarieId], references: [id])
  salarieId  String
  magasin    Magasin  @relation(fields: [magasinId], references: [id])
  magasinId  String
  actif      Boolean  @default(true)
  @@unique([salarieId, magasinId])
}

// ⚠️ RGPD — voir §7. Stocker le strict nécessaire.
model SalarieDocument {
  id         String   @id @default(cuid())
  salarie    Salarie  @relation(fields: [salarieId], references: [id])
  salarieId  String
  type       DocType
  fichierUrl String   // Supabase Storage, bucket privé chiffré
  ajouteLe   DateTime @default(now())
  expireLe   DateTime? // date de purge automatique
}

enum DocType { PERMIS CARTE_VITALE PIECE_IDENTITE }

model Produit {
  id        String   @id @default(cuid())
  nom       String   // parfum / type de flan
  prix      Decimal
  actif     Boolean  @default(true)
  lignes    LigneVente[]
  stock     StockProduitJour[]
}

// Stock de produit fini par magasin ET par jour.
model StockProduitJour {
  id                 String   @id @default(cuid())
  magasinId          String
  produitId          String
  date               DateTime @db.Date
  quantiteInitiale   Int      // ce qui a été livré/produit le matin
  quantiteRestante   Int      // décrémentée à chaque vente
  magasin            Magasin  @relation(fields: [magasinId], references: [id])
  produit            Produit  @relation(fields: [produitId], references: [id])
  @@unique([magasinId, produitId, date])
}

model Vente {
  id            String   @id @default(cuid())
  magasinId     String
  salarieId     String
  dateHeure     DateTime @default(now())
  total         Decimal
  modeReglement ModeReglement
  lignes        LigneVente[]
  magasin       Magasin  @relation(fields: [magasinId], references: [id])
  salarie       Salarie  @relation(fields: [salarieId], references: [id])
  syncId        String?  @unique // idempotence pour la synchro offline
}

enum ModeReglement { ESPECES CB }

model LigneVente {
  id         String  @id @default(cuid())
  venteId    String
  produitId  String
  quantite   Int
  prixUnit   Decimal
  remise     Decimal @default(0) // remise/promo appliquée
  vente      Vente   @relation(fields: [venteId], references: [id])
  produit    Produit @relation(fields: [produitId], references: [id])
}

model Objectif {
  id         String   @id @default(cuid())
  magasinId  String
  date       DateTime @db.Date
  objectifCA Decimal? // objectif en €
  objectifQte Int?    // ou en quantité
  magasin    Magasin  @relation(fields: [magasinId], references: [id])
  @@unique([magasinId, date])
}

model Promotion {
  id         String   @id @default(cuid())
  magasinId  String
  produitId  String?  // null = tout le magasin
  type       PromoType
  valeur     Decimal  // % ou € selon type
  debut      DateTime
  fin        DateTime
  actif      Boolean  @default(true)
  magasin    Magasin  @relation(fields: [magasinId], references: [id])
}

enum PromoType { POURCENTAGE MONTANT }

model Consommable {
  id     String @id @default(cuid())
  nom    String
  type   ConsoType
  stocks StockConsommable[]
}

enum ConsoType { PACKAGING SERVIETTE BOISSON }

model StockConsommable {
  id            String @id @default(cuid())
  magasinId     String
  consommableId String
  quantite      Int
  seuilMin      Int
  magasin       Magasin     @relation(fields: [magasinId], references: [id])
  consommable   Consommable @relation(fields: [consommableId], references: [id])
  @@unique([magasinId, consommableId])
}
```

---

## 3. Feature par feature

### F1 — Gestion des salariés
- CRUD salarié : nom, prénom, email, téléphone.
- **Upload de documents** : permis de conduire, carte Vitale, pièce d'identité (scan photo ou fichier) → stockés dans un **bucket Supabase privé** (voir §7 RGPD).
- Chaque salarié a un **code caisse** (PIN 4–6 chiffres) qui lui sert à ouvrir la caisse.
- Un salarié est **affecté à un ou plusieurs magasins** (table `Affectation`), modifiable à tout moment.

### F2 — Ouverture de caisse
- Sur la tablette d'un magasin, le vendeur saisit son **code caisse**.
- Vérif : le code existe, le salarié est **actif** et **affecté à ce magasin**.
- Le PIN est **hashé** en base (jamais en clair). Le device connaît son `magasinId` (config locale de la tablette).

### F3 — Ventes & décrément du stock produit
- Écran de vente rapide : sélection produit(s) → quantité → total calculé → mode de règlement (espèces / CB) → valider.
- À la validation : création de la `Vente` + `LigneVente`, et **décrément immédiat** de `StockProduitJour.quantiteRestante` du magasin pour chaque produit vendu.
- **Hors-ligne** : la vente est enregistrée localement (IndexedDB) avec un `syncId` unique, puis rejouée à la reconnexion. Le `@@unique(syncId)` garantit l'**idempotence** (pas de double comptage).
- **Reste du jour** = `quantiteRestante` → c'est la donnée que le **producteur** consulte le soir pour planifier les quantités du lendemain.

### F4 — Objectifs & alertes de ventes
- Le gérant fixe un **objectif journalier** par magasin (`objectifCA` ou `objectifQte`).
- L'app compare en continu les ventes du jour à l'objectif. Règle d'alerte proposée : à un **seuil horaire** (ex. si à 15 h on est < X % de l'objectif) → alerte au gérant.
- Depuis l'alerte, action en 1 clic : **créer une promo/un rabais** (`Promotion`) pour écouler le stock et **éviter les invendus**. La promo s'applique automatiquement à l'écran vendeur du/des magasins ciblés.

### F5 — Stock consommables & réassort
- Chaque magasin a un stock de **packaging / serviettes / boissons** (`StockConsommable`) avec un **seuil minimum** par article.
- Dès que `quantite < seuilMin` → **alerte logistique** (notif in-app + mail Resend) pour réassort.
- Vue logistique : liste des articles sous seuil, tous magasins confondus.

### F6 — Dashboard super-admin temps réel
- Vue toutes boutiques : **CA du jour, nb de ventes, stock restant, % objectif atteint, alertes actives** par magasin.
- **Temps réel** via **Supabase Realtime** (souscription aux `Vente` / `StockProduitJour` / alertes).
- Filtres : par magasin, par jour, par produit.

---

## 4. Temps réel & offline (points d'architecture)

- **Temps réel dashboard** : Supabase Realtime (canaux Postgres changes) sur les tables clés.
- **Offline vendeur** : file d'attente locale (IndexedDB via Dexie ou équivalent) + worker de synchro. Chaque opération porte un `syncId`. La synchro est **idempotente** et gère le cas « stock négatif » (à la reconnexion, si le stock serveur ne suffit pas → on enregistre quand même la vente et on lève une alerte d'écart de stock à réconcilier).
- Le **décrément de stock** doit être fait côté serveur dans une **transaction** (`prisma.$transaction`) pour éviter les incohérences en cas de ventes simultanées.

---

## 5. Ordre de build suggéré (pour Cursor)

1. Schéma Prisma + migrations + seed (magasins, produits, consommables de test).
2. CRUD Magasins & Salariés + affectations.
3. Ouverture de caisse (PIN) + écran de vente.
4. Décrément stock produit + reste du jour (vue producteur).
5. Synchro offline des ventes.
6. Objectifs + alertes + création de promos.
7. Stock consommables + alertes réassort logistique.
8. Dashboard super-admin temps réel.

---

## 6. Hypothèses prises (à confirmer)

- Le stock produit est **réinitialisé chaque matin** (`StockProduitJour` par date). Si tu veux un stock « roulant » multi-jours, à préciser.
- L'objectif est **journalier** par magasin. (Hebdo/mensuel possible en plus.)
- Une tablette = **un magasin fixe** (config device). Si une tablette peut servir plusieurs magasins, le vendeur choisira le magasin à l'ouverture.
- Le code caisse **identifie** le vendeur mais n'est pas une session bancaire.

---

## 7. ⚠️ Point de vigilance RGPD (à ne pas ignorer avant la prod)

Le scan et la **conservation** de la **carte Vitale** (numéro de sécurité sociale / NIR), du **permis** et de la **pièce d'identité** des salariés sont **fortement encadrés en France**. En pratique, un employeur n'a en général **pas le droit de conserver durablement** des copies de ces documents, et le NIR de la carte Vitale relève d'un traitement très restreint (avis CNIL).

Recommandations pour ne pas te mettre en risque :
- Ne conserver que le **strict nécessaire** et **le moins longtemps possible** (champ `expireLe` + purge automatique).
- **Bucket privé chiffré**, accès restreint (RLS Supabase), traçabilité des accès.
- Envisager le mode **« vérifier puis ne pas stocker »** (scan pour contrôle à l'embauche, sans archivage de l'image).
- Faire valider la **finalité + durée de conservation** par ton conseil (expert-comptable / juriste) avant mise en prod.

Ce n'est pas un avis juridique — juste un signal pour que tu tranches ce point tôt, car il conditionne le design de la table `SalarieDocument`.
