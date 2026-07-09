# Étapes suivantes

État détaillé (ce qui est fait) dans `README.md`. Ce fichier liste ce qui reste, par ordre de priorité logique.

## Phase 6 — Polish PWA & robustesse

- Gestion des échecs pipeline : retry transcription/extraction si Voxtral ou Mistral échoue en cours de route (aujourd'hui, une erreur au milieu de `POST /captures` laisse la capture dans un état intermédiaire sans retry).
- Ajustement empirique des seuils de confiance de matching (`HIGH_CONFIDENCE=0.90`, `LOW_CONFIDENCE=0.60` dans `matching.py`), de la fenêtre de regroupement en séance (3h dans `workout_sessions.py`), et du forfait de durée par série (`SECONDS_PER_SET_ESTIMATE=90` dans `services/calories.py`) à partir de l'usage réel.
- Remplacer les icônes PWA placeholder (`frontend/public/icons/`) par une vraie identité visuelle.
- Manifest/service worker : au-delà du cache d'assets actuel, revoir si un minimum de résilience offline (file d'attente d'upload si le réseau coupe en salle de sport) est souhaité — explicitement hors périmètre V1 pour l'instant.

## Dette technique connue

- **Aucun test automatisé** (pytest) — tout a été vérifié manuellement (curl, navigateur réel) au fil de l'eau, mais rien ne protège contre une régression silencieuse sur le matching, l'ETL Ciqual ou le calcul des macros.
- **Ciqual n'a pas d'entrée "œuf entier, cru"** (seulement blanc et jaune séparés) — trouvé en Phase 1, jamais résolu. Une dictée "un œuf" ne matchera rien de satisfaisant tant que ce n'est pas géré (fiche combinée ou aliment "œuf entier" créé manuellement).
- **Table de portions usuelles limitée à 31 aliments** — à faire grandir au fil de l'usage réel (aliments fréquemment dictés sans grammage explicite qui finissent en `needs_quantity_confirmation`). Vérifier aussi, quand un alias existant tombe en confirmation malgré une portion "connue" ailleurs dans Ciqual, si l'alias pointe vers une entrée différente de celle qui a la portion seedée (cas trouvé et corrigé pour "pomme" en post-Phase 4 — d'autres alias plus anciens n'ont pas été audités un par un).
- **`met_value` absent sur les fiches exercice/activité créées avant l'introduction du calcul de calories** (Phases 3/4) — resteront `None` (donc `calories_kcal` non calculé) tant qu'elles ne sont pas corrigées manuellement ou recréées ; pas de backfill rétroactif fait. Correction manuelle désormais possible via l'écran Catalogue (Phase 5, `PATCH /exercises|activities/{id}`), mais aucune ne l'a été.
- **Estimation calories musculation approximative** : aucune durée n'est mesurée par série (contrairement au cardio, où la durée est dictée) — `WorkoutSession.calories_kcal` utilise un forfait de 90s/série (travail + repos), pas une mesure. À affiner (cf. Phase 6).
- **Fusion de fiches catalogue (Phase 5) ne recalcule jamais les calories déjà loggées** même si la fiche absorbée et la fiche survivante ont des `met_value` différents — choix délibéré (cohérence avec le principe "snapshot ne bouge jamais"), mais peut surprendre si quelqu'un s'attend à un historique "corrigé" après une fusion.
- **Écrans Historique/Catalogue (Phase 5) vérifiés par `tsc`/`oxlint` + tests backend réels (curl), mais pas cliqués dans un vrai navigateur** — contrairement aux phases précédentes, la vérification finale en conditions réelles (navigation veille/lendemain, formulaires d'édition, confirmation de fusion) reste à faire par l'utilisateur.
- Repo pas encore initialisé en tant que dépôt git.
- Un fichier audio de test orphelin peut traîner dans le bucket Supabase Storage (nettoyage mineur, sans impact fonctionnel).

## Rappel : hors périmètre V1 (déjà acté, à ne pas faire sans en rediscuter)

- Pas de streaming temps réel.
- Pas d'app native.
- Pas de fonctionnalités sociales.
- Mono-utilisateur, pas d'authentification.
