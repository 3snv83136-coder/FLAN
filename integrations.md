# integrations.md — Intégrations & outils externes

## Stack de base
| outil | rôle | notes |
|---|---|---|
| **Supabase** | Postgres, Auth, RLS, Storage, Realtime | base de tout. Auth = comptes des ~10 users |
| **Next.js** | front + API routes | App Router, TypeScript |
| **Vercel** | hébergement / déploiement | connecté au repo GitHub |
| **GitHub** | versioning | — |
| **Claude Code** | assistant de build | lit `docs/` en continu |

## Intégrations tierces en v1
**Aucune.** Décision assumée pour livrer vite.

En particulier :
- **Paiement CB** : ❌ pas d'intégration. Encaissement sur **terminal CB séparé**. L'app enregistre seulement le montant et le mode (`especes` / `cb`).
- Pas de paiement en ligne (Stripe/SumUp/…), pas d'impression, pas d'email/SMS, pas d'IA, pas d'export compta en v1.

## Candidats backlog (à rebrancher plus tard)
| besoin | piste | phase envisagée |
|---|---|---|
| Réconciliation CB | API SumUp / terminal connecté | v2+ |
| Tickets de caisse | imprimante thermique (ESC/POS / bluetooth) | v2+ |
| Alertes stock bas / DLC / récap | email (Resend) ou SMS (un fournisseur FR) | v2+ |
| Export comptable | export CSV/tableur, puis connecteur compta | v2+ |
| Prévision de production | logique interne / IA (API Anthropic déjà dispo dans la stack) | v2+ |
| Pointage externe (badgeuse) | connecteur vers un logiciel de pointage | v2+ |

## Variables d'environnement (à mettre dans Vercel + `.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # serveur uniquement, jamais exposé au client
```
> Ne jamais committer de clé. `SUPABASE_SERVICE_ROLE_KEY` reste côté serveur.
