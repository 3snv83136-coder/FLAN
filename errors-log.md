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
| 2026-08-13 | Vercel /login | Application error Digest serveur | `redirect()` dans server action + `cookies().set` avalé/échoué en RSC | Login retourne `{ok}` + nav client ; `createClient` (set) vs `createClientReadOnly` (RSC) | Ne pas `redirect()` depuis action appelée hors flux navigation clair ; ne jamais set cookies en RSC |
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |

<!--
Modèle de ligne à copier :
| 2026-MM-JJ | contexte | message d'erreur | cause racine | correctif | prévention |
-->
