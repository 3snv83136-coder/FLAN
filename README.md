# FLAN

App interne de **production + vente de flans** (multi-points de vente).

Stack : Next.js 14 · Supabase · Vercel · TypeScript.

## Docs projet

- `CLAUDE.md` — règles de build
- `app-spec.md` — spécification
- `data-dictionary.md` — schéma / noms de champs
- `feature-backlog.md` — phases
- `brand-brief.md` — UI
- `integrations.md` — env & outils
- `errors-log.md` — journal d’erreurs

## Setup local (Phase 0)

1. Copier l’env :
   ```bash
   cp .env.example .env.local
   ```
2. Créer un projet [Supabase](https://supabase.com), coller URL + anon key + service role dans `.env.local`.
3. Dans le SQL Editor Supabase, exécuter **dans l’ordre** :
   - `supabase/migrations/0001_init_schema.sql`
   - `supabase/migrations/0002_record_sale.sql`
   - `supabase/migrations/0003_agenda_fabrication.sql`
   - `supabase/migrations/0004_agenda_rh.sql`
4. Installer & seed :
   ```bash
   npm install
   npm run seed
   npm run dev
   ```
5. Connexion **sans mot de passe** : ouvrir `/login` et taper ton nom
   (Camille Vendeur / Alex Producteur / Sam Gérant).

## Déploiement

Connecter le repo GitHub à Vercel, ajouter les 3 variables d’env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
