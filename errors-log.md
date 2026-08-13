# errors-log.md — Journal des erreurs

> **But** : ne jamais recasser deux fois la même chose. Dès qu'un bug non trivial apparaît (build cassé, requête qui échoue, RLS qui bloque, synchro offline foireuse…), on ajoute UNE ligne ici. Claude Code doit consigner ici (voir `CLAUDE.md` §3.4).
>
> **Comment remplir** : une ligne par incident. Reste factuel. La colonne *Prévention* est la plus importante — c'est elle qui évite la récidive.

## Colonnes
- **Date** : AAAA-MM-JJ
- **Contexte / écran** : où ça s'est produit (ex. « écran vendeur — synchro », « migration SQL »)
- **Erreur** : message ou symptôme observé
- **Cause racine** : le *vrai* pourquoi, pas le symptôme
- **Correctif** : ce qui a réglé le problème
- **Prévention** : la règle/le réflexe pour que ça ne revienne pas

---

| Date | Contexte / écran | Erreur | Cause racine | Correctif | Prévention |
|---|---|---|---|---|---|
| 2026-08-13 | Agenda / profiles | Could not find the 'contract_type' column of 'profiles' in the schema cache | Migration `0004` non exécutée (ou cache PostgREST pas rechargé) | Script idempotent `0006_fix_hr_schema.sql` + `NOTIFY pgrst` | Après chaque ALTER, relancer le SQL Editor et `NOTIFY pgrst, 'reload schema'` |
| 2026-08-13 | Seed PIN caisse | function gen_salt(unknown) does not exist | `set_caisse_pin` en `search_path = public` alors que pgcrypto est dans `extensions` | `0008_fix_caisse_pin_pgcrypto.sql` : `search_path = public, extensions` | Sur Supabase, toujours inclure `extensions` dans le search_path des fonctions qui appellent `crypt` / `gen_salt` |
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |

<!--
Modèle de ligne à copier :
| 2026-MM-JJ | contexte | message d'erreur | cause racine | correctif | prévention |
-->
