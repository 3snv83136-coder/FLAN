# SPEC COMPTOIR — Le Comptoir du Flan

Dossier de **spécification fonctionnelle v1** pour Cursor / Claude.

Marque : **Le Comptoir du Flan** (parfois écrit « des Flancs » dans les brouillons — on retient **Flan**).

## Fichiers

| Fichier | Rôle |
|---|---|
| [SPEC.md](./SPEC.md) | Spec complète (rôles, modèle, features, offline, RGPD) |
| [mapping-existant.md](./mapping-existant.md) | Correspondance avec les tables déjà en prod (`data-dictionary.md`) |
| [ecarts-a-trancher.md](./ecarts-a-trancher.md) | Écarts spec vs règles projet (Prisma, Resend, PIN, nouveau rôle) |

## Comment l’utiliser

1. Lire `SPEC.md` pour le **quoi**.
2. Lire `mapping-existant.md` avant de **coder** : on réutilise les noms du dictionnaire.
3. Si un champ n’existe pas → l’ajouter d’abord dans `data-dictionary.md` (règle `CLAUDE.md`).

## Stack réelle du repo (prioritaire sur le brouillon Prisma)

- Next.js 14 App Router · TypeScript · Tailwind
- **Supabase** (Postgres + Auth + RLS + Storage) — **pas Prisma**
- Vercel · GitHub
- Argent en **centimes** (`*_cents`) · dates `timestamptz` UTC · `snake_case`
