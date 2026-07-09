# Vox App

Suivi sportif (alimentation, activité, musculation) où toute la saisie se fait par dictée vocale. Voir le plan de développement complet dans la conversation Claude Code d'origine, ou `git log`/le code pour l'état d'avancement réel.

Stack : FastAPI + Pydantic v2 + SQLModel · Postgres/Supabase (pgvector, pg_trgm) · Mistral (Voxtral, Custom Structured Outputs, mistral-embed) · React + Vite + TS + Tailwind (PWA).

## Prérequis à configurer manuellement (une fois)

1. **Projet Supabase** — créer un projet sur [supabase.com](https://supabase.com).
2. **Connexion Postgres — Session pooler** — Dashboard > Project Settings > Database > Connection string > onglet **Session pooler** (pas "Direct connection" : ce hostname n'a qu'un enregistrement DNS IPv6 et échoue depuis Docker/Colima ou tout hébergeur sans sortie IPv6 — vérifié en pratique). Le Session pooler reste une connexion Postgres brute via URL (pas le SDK supabase-py) et n'a pas les pièges "prepared statements" du mode Transaction pooler. Remplacer `postgresql://` par `postgresql+asyncpg://`, retirer les crochets `[ ]` autour du mot de passe (délimiteurs de template Supabase, pas des caractères réels), et percent-encoder les caractères spéciaux qu'il contiendrait (`/`, `?`, `@`, `#`...).
3. **Extensions `vector` et `pg_trgm`** — pas d'action manuelle nécessaire : la première migration Alembic (`alembic upgrade head`) les active elle-même (`CREATE EXTENSION IF NOT EXISTS ...`), le rôle `postgres` de Supabase y est autorisé.
4. **Bucket Storage pour l'audio** — Dashboard > Storage > New bucket > nom `voice-captures` (privé). Utilisé pour conserver les enregistrements bruts des dictées.
   `SUPABASE_URL` = Project Settings > API > Project URL (`https://xxxxx.supabase.co`).
   `SUPABASE_SERVICE_ROLE_KEY` = Project Settings > **API Keys** > section **Secret keys**, une clé `sb_secret_...` (nouveau format Supabase qui remplace `service_role`). Ne pas confondre avec la clé `sb_publishable_...` (équivalent `anon`, publique, pas celle-là).
5. **Clé API Mistral** — [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys).
6. Copier les fichiers d'environnement et renseigner les valeurs ci-dessus :
   ```
   cp .env.example .env
   cp frontend/.env.example frontend/.env
   ```

## Lancer en local

### Avec Docker Compose

Nécessite Docker. Sur cette machine, installé via [Colima](https://github.com/abiosoft/colima) (`brew install colima docker docker-compose`, puis `colima start`) plutôt que Docker Desktop — pas d'étape d'installation manuelle (mot de passe admin, GUI). Si le projet vit hors de `$HOME` (ex : disque externe), Colima ne le monte pas dans sa VM par défaut, et sans propagation inotify le rechargement à chaud (`--reload`) ne se déclenche pas sur les changements faits depuis l'hôte :
```
colima start --mount /Volumes/SSD:w --mount ~:w --mount-inotify
```

```
docker compose up
```

Backend sur http://localhost:8000 (docs interactives sur `/docs`), frontend sur http://localhost:5173.

### Sans Docker

```
cd backend
uv sync
uv run alembic upgrade head
uv run fastapi dev app/main.py
```

```
cd frontend
npm install
npm run dev
```

### Vérifier que tout est branché

`GET http://localhost:8000/health` doit répondre `{"status": "ok"}` (vérifie aussi la connexion DB). La page d'accueil du frontend affiche l'état de cette connexion.

**Piège vécu (1)** : après avoir modifié beaucoup de fichiers frontend d'un coup, le serveur Vite du conteneur peut continuer à servir une version obsolète (vu en pratique : le rechargement à chaud n'avait pas suivi malgré l'inotify fix). Un `npm run build` sur l'hôte ne le révèle pas (c'est un process séparé) — vérifier ce qui est réellement servi avec `curl http://localhost:5173/src/App.tsx` et comparer, ou simplement `docker compose restart frontend` par précaution après un gros lot de changements.

**Piège vécu (2)** : si le disque externe portant le projet se déconnecte puis se reconnecte (débranchement accidentel), le montage Colima reste dans un état incohérent même après reconnexion — `docker compose restart` échoue alors avec une erreur du type `mkdir /Volumes/SSD: file exists`, et le frontend peut répondre 404 sur `/` tout en servant les fichiers JS individuels normalement. Le seul fix fiable observé : redémarrer Colima entièrement (`colima stop` puis `colima start --mount ... --mount-inotify`), pas juste les conteneurs.

## Structure du repo

```
backend/    FastAPI — app/{models,schemas,services,routers}, migrations/ (Alembic), scripts/ (ETL Ciqual, seed portions)
frontend/   PWA React + Vite + TS + Tailwind
```

Le détail du modèle de domaine (tables, pipeline vocal, phases de développement) est dans le plan initial du projet.

## État d'avancement

- **Phase 0 (socle technique)** : fait — schéma DB complet (12 tables), migration vérifiée contre un vrai Postgres+pgvector, health-check, PWA installable. `docker compose up` vérifié de bout en bout contre le vrai projet Supabase (backend + frontend + CORS + connexion DB réelle).
- **Phase 1 (référentiel aliments Ciqual + portions)** : fait — 3323 aliments Ciqual 2025 importés (`scripts/import_ciqual.py`) avec macros complètes, 30 portions usuelles curées et appliquées (`scripts/seed_portions.py`), endpoints `GET /foods?query=` et `GET /foods/{id}` vérifiés contre la vraie base ("pomme" → "Pomme, chair et peau, crue", 54 kcal/100g, portion "1 pomme" = 180g). Embeddings mistral-embed calculés pour les 3323 aliments (`scripts/backfill_embeddings.py`) et requête kNN pgvector vérifiée en réel.
  **Constat empirique important pour la Phase 2** : la similarité sémantique seule (embeddings) ne suffit pas à désambiguïser de manière fiable des cas comme "pomme" (confondu avec "pomme de terre") ou "yaourt nature" (plusieurs variantes proches) — le top-1 n'est pas toujours le bon. Confirme que la logique de seuil de confiance + confirmation utilisateur prévue au plan est nécessaire, pas juste une option prudente.
- **Phase 2 (pipeline vocal repas)** : fait — pipeline complet vérifié en conditions réelles (vraie dictée vocale, vrai navigateur, vrai appareil) : `POST /captures` (upload audio → Supabase Storage → transcription Voxtral → extraction structurée Custom Structured Outputs → matching hybride pg_trgm/pgvector → fallback Open Food Facts) et `POST /captures/{id}/validate` (création du repas, apprentissage des alias). Frontend : `RecordButton` (MediaRecorder, détection de format compatible Safari/iOS) + `ValidationScreen` (édition/confirmation par aliment, création de nouveaux aliments emballés). Le mécanisme "jamais redemander" est vérifié : après une première confirmation, le même mot dicté ressort en confiance maximale via l'alias appris.
  **Note technique** : l'ancien endpoint de recherche Open Food Facts (`cgi/search.pl`, `api/v2/search`) renvoie 503 en pratique — migré vers `search.openfoodfacts.org` (nouveau service "search-a-licious").
- **Phase 3 (musculation)** : fait — matching d'exercices (`match_exercise`, même cœur hybride pg_trgm/pgvector que `match_food`, factorisé), regroupement automatique en séance (`get_or_create_active_session`, fenêtre de 3h), création automatique de fiche exercice si aucun candidat (pas de confirmation nécessaire, contrairement aux aliments — pas de macros à fournir). Dédoublonnage des créations au sein d'une même requête de validation (plusieurs séries d'un exercice inédit ne créent qu'une seule fiche). Métrique de difficulté = **RIR** (répétitions en réserve) plutôt que RPE, sur demande explicite. UI : une carte par exercice regroupant toutes ses séries (reps/poids/RIR tous facultatifs, ajout/retrait de série), pas une carte par série. Vérifié en conditions réelles par l'utilisateur.
- **Phase 4 (activités cardio/autres)** : fait — `match_activity` (même cœur générique `_hybrid_match` que food/exercice), `ExtractedActivity` enfin câblé dans le pipeline (défini depuis la Phase 2, jamais traité jusqu'ici). Pas de regroupement en séance (contrairement à la musculation) : chaque activité dictée est une entrée `ActivityLog` autonome. Durée et distance toutes deux facultatives et indépendantes (vérifié : dictée avec distance seule, sans durée). Création automatique + dédoublonnage par requête + apprentissage d'alias, identiques au patron des exercices. Vérifié en conditions réelles par l'utilisateur (via le mode texte, cf. ci-dessous).
  **Outil ajouté en cours de route** : `POST /captures/from-text` (+ champ texte "mode test" sur l'écran d'accueil) simule une transcription sans audio/micro — saute Storage+Voxtral, va directement à l'extraction. Pratique pour tester ou développer sans pouvoir/vouloir parler à voix haute. Partage tout le reste du pipeline (`_process_transcript`) avec l'endpoint audio réel, donc aucune divergence de comportement entre les deux chemins.
- **Corrections/évolutions post-Phase 4** (avant Phase 5) : fait —
  - **Aliments : confiance "ambiguë" traitée comme "haute"**. La correspondance la plus probable (meilleur score) est retenue par défaut même en cas d'ambiguïté, plutôt que de forcer un choix — les autres propositions restent visibles et modifiables sur `FoodItemRow`. Ne change rien pour les exercices/activités (toujours "confirmation requise" si ambigu), sur demande explicite limitée aux aliments.
  - **Quantité en nombre d'unités pour les aliments consommés entiers** (fruits, yaourts, tranches de pain...) plutôt qu'en poids. Le LLM d'extraction remplit `quantity_units` (ex: "deux pommes" → 2) au lieu de forcer un poids ; le poids est calculé (`quantity_units x default_portion_grams`) à partir de la portion usuelle déjà connue de l'aliment (Phase 1). `FoodItemRow` affiche un champ "Nombre" à la place du champ grammes quand la correspondance sélectionnée a une portion connue.
    **Piège trouvé en vérifiant** : l'alias "pomme" appris en Phase 2 pointait vers l'entrée Ciqual "Pomme, chair sans peau, crue (aliment moyen)", qui n'avait pas de portion seedée (contrairement à "Pomme, chair et peau, crue") — "deux pommes" retombait donc en confirmation de poids malgré la fonctionnalité. Corrigé en ajoutant la portion manquante dans `seed_portions.py` (l'alias existant n'a pas été touché).
  - **Calories dépensées** (musculation + activités), en fonction d'un profil biométrique (sexe, date de naissance, taille, poids) saisi une fois via un petit formulaire (`GET/PUT /profile`, écran "Profil" — seule donnée saisie hors dictée vocale : c'est une configuration ponctuelle, pas un journal d'événements). Calcul = MET (équivalent métabolique standard, 1 MET = 1 kcal/kg/h) x poids x durée : le poids est le facteur biométrique déterminant par définition du MET, âge/taille/sexe sont stockés dans le profil mais n'entrent pas dans ce calcul (pas de justification à les y intégrer sans un modèle plus poussé type BMR). Le MET de chaque exercice/activité est estimé par le LLM d'extraction à la création de la fiche (`met_value` sur `StrengthExercise`/`ActivityType`) — jamais redemandé ensuite, même logique que les macros dictées une fois pour un aliment emballé. Pour les activités cardio, la durée dictée donne directement les calories (`ActivityLog.calories_kcal`). Pour la musculation, aucune durée n'est mesurée par série : `WorkoutSession.calories_kcal` additionne, pour chaque série de la séance, `MET x poids x forfait de 90s/série` (travail + repos) — une estimation documentée comme telle, pas une mesure. `calories_kcal` reste `None` tant que le profil n'est pas renseigné ou que le MET d'un exercice/activité existant (créé avant cette fonctionnalité) est inconnu — pas d'erreur, dégradation silencieuse. Vérifié en réel : `9.8 MET x 45min` (zumba, fiche neuve) → `410.625 kcal`, `3 séries x 6.0 MET` (kettlebell swing, fiche neuve) → `33.75 kcal` sur la séance.
- **Phase 5 (historique & corrections)** : fait — trois volets, backend vérifié de bout en bout par étape (curl contre la vraie base), frontend vérifié par `tsc`/`oxlint` + relecture (pas de clic réel en navigateur de ma part, à confirmer par l'utilisateur) :
  - **Consultation** : `GET /history?date=` (nouveau `routers/history.py`) renvoie en un seul appel les repas/séances/activités d'un jour calendaire Europe/Paris, avec leurs objets catalogue imbriqués (`selectinload`, première utilisation dans ce projet) pour l'affichage des noms sans requête supplémentaire. Une séance de musculation est rattachée au jour de son `started_at` uniquement — vérifié en réel sur une séance commencée à `22:24:59 UTC` (`00:24:59` heure de Paris) : correctement classée le lendemain, pas la veille. Écran `HistoryScreen` (navigation veille/lendemain) avec `HistoryMealCard`/`HistoryWorkoutCard`/`HistoryActivityLogRow`, tous nouveaux (pas d'adaptation des cartes de validation, structurellement différentes : plus de résolution de candidat à gérer une fois une ligne persistée).
  - **Édition/suppression** : nouveaux routers `meals.py`/`workouts.py`/`activity_logs.py`. Éditer la quantité d'un aliment recalcule ses macros snapshot depuis la fiche aliment actuelle ; supprimer la dernière ligne d'un repas ou la dernière série d'une séance supprime aussi le parent (cascade applicative en Python, pas de `ondelete` en base). Toute mutation d'une série recalcule `WorkoutSession.calories_kcal` (`services/calories.py` : `_compute_workout_session_calories` déplacé de `validation.py`, désormais public et partagé). Vérifié en réel : édition/suppression sur repas, séance (recalcul progressif des calories série par série) et activité (recalcul proportionnel à la durée).
  - **Catalogue** : `GET/PATCH /foods/{id}`, nouveaux `exercises.py`/`activities.py` (mêmes routes), `DELETE .../aliases/{id}`, `POST .../merge` (nouveau `services/catalogue.py`, cœur générique partagé par les 3 domaines). Une fusion réassigne les alias (en écartant silencieusement les doublons texte) et toutes les lignes qui référencent la fiche supprimée, sans jamais recalculer rétroactivement les calories déjà loggées — cohérent avec la philosophie "snapshot ne bouge jamais" déjà appliquée aux macros. Vérifié en réel sur un doublon synthétique : `merged_alias_count`/`reassigned_reference_count` corrects, fiche source supprimée, et surtout la ligne réassignée a gardé son `calories_kcal` d'origine (calculé avec le MET de la fiche supprimée) plutôt que d'être recalculée avec le MET de la fiche survivante. Renommer une fiche recalcule son embedding.
  - Écran `CatalogueScreen` (onglets aliment/exercice/activité + recherche) → `CatalogueEntryDetail` (vue/édition/alias/fusion) → `MergePicker` (recherche de la cible + confirmation explicite du sens de la fusion, irréversible).
  - Aucune migration Alembic nécessaire pour cette phase (aucune nouvelle colonne/table).

## Notes

- Pas d'authentification en V1 (mono-utilisateur). À ne pas exposer publiquement sans au moins un accès protégé, les données de santé étant sensibles.
- Les icônes PWA dans `frontend/public/icons/` sont des placeholders générés automatiquement — à remplacer par une vraie identité visuelle quand souhaité.
- Repo pas encore initialisé en tant que dépôt git.
- Données Ciqual sous Licence Ouverte/Etalab : citer "Anses. 2025. Table Ciqual 2025" en cas de réutilisation/publication.
