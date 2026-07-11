# Audit de friction — flux de capture (repas & entraînement)

Audit du code réel sur `frontend-updates`, en regard de `PLAN_FRICTION_UNIVERS_GRAPHIQUE.md`. Aucun fichier de code n'a été modifié. Portée : uniquement le chemin "l'utilisateur ouvre l'app → c'est enregistré en base".

## Méthode et hypothèses de départ

- Le point d'entrée de toute capture (repas **et** entraînement) est le même écran : `App.tsx` (`screen === 'capture'`), avec un seul `MicButton`. Il n'existe **pas** d'écran de capture séparé pour l'entraînement — `TrainingScreen.tsx` n'est qu'un historique (séances passées, volume hebdo), jamais un point d'enregistrement. Donc "RecordButton" = `MicButton.tsx`, et il n'y a qu'une seule `ValidationScreen.tsx` qui affiche selon le cas des `FoodItemRow`, `ExerciseGroupCard` et/ou `ActivityItemRow`.
- Hypothèse : l'app s'ouvre déjà sur l'écran `capture` (`screen` vaut `'capture'` par défaut dans `App.tsx:24`), donc "ouvrir l'app" = 0 tap avant de voir le micro. Si l'utilisateur était sur un autre onglet (nav du bas), il faudrait +1 tap — non compté ici.
- Un tap = un `onClick`/`onPress` réel sur un élément interactif. Les transitions pilotées par `useState`/`useEffect` suite à une promesse résolue (upload, extraction) sont marquées **auto**.
- Le cycle micro est un bouton **toggle unique** (`MicButton.tsx:43-68`) : démarrer l'enregistrement et l'arrêter sont **deux taps distincts** sur le même bouton (`handleClick`, `MicButton.tsx:30-39`).
- Après un `Confirmer` réussi, `App.tsx` passe en `flow === 'done'` et **n'affiche plus le micro** (`{flow === 'idle' && ...}`, `App.tsx:90`). Il faut taper sur **« Nouvelle dictée »** (`App.tsx:151`, `onClick={reset}`) pour repasser en `idle` et revoir le micro. Il n'y a aucun retour automatique — c'est exactement la friction listée dans le plan (§2, ligne "Retour au flux normal") mais elle n'est **pas encore corrigée** dans le code actuel.

---

## Scénario 1 — Repas simple (2-3 aliments, haute confiance)

**Trace :**

| # | Tap réel ? | Composant / ligne | Action |
|---|---|---|---|
| 1 | Oui | `MicButton.tsx:45` (`handleClick`→`start`) | Démarrer l'enregistrement |
| — | Auto | `useAudioRecorder.ts:30-47` | Enregistrement en cours (dictée) |
| 2 | Oui | `MicButton.tsx:45` (`handleClick`→`stop`) | Arrêter l'enregistrement |
| — | Auto | `App.tsx:42-53` (`handleRecorded`) | Upload → `flow='uploading'` → `createCapture` → `flow='validating'` |
| — | Auto | `App.tsx:130-141` | Affichage de `ValidationScreen` |
| — | Auto | `buildEditableItems.ts:23-32` | Pour chaque aliment `match_confidence==='high'`, résolution directe sur `candidates[0]`, poids calculé depuis la portion connue si non dicté — **aucune action utilisateur nécessaire par item** |
| 3 | Oui | `ValidationScreen.tsx:179` (`handleSubmit`) | Tap « Confirmer » (un seul bouton pour tous les aliments, pas un par item) |
| — | Auto | `ValidationScreen.tsx:107-112`, `App.tsx:134-137` | `validateCapture` → écrit en base → `flow='done'` |

**Total : 3 taps** (démarrer, arrêter, confirmer).

Le bouton « Tout confirmer » demandé au §3 du plan existe déjà de facto : `Confirmer` (`ValidationScreen.tsx:177-184`) valide en un tap tous les items en même temps, il n'y a pas de confirmation par ligne. Pour ce scénario le flux est déjà quasi minimal.

**Incertitude :** si aucun poids n'a été dicté et qu'aucune portion par défaut n'est connue pour l'aliment (`portion === null` dans `FoodItemRow.tsx:83-115`), `quantityGrams` reste `null`, `foodItemsReady` est faux (`ValidationScreen.tsx:65-67`) et `canSubmit` bloque — l'utilisateur doit alors taper un chiffre dans le champ grammes avant de pouvoir confirmer. Ce cas dépend de l'extraction backend (LLM), impossible à trancher statiquement depuis le frontend.

---

## Scénario 2 — Repas ambigu (1 aliment sur 3-4 nécessite une confirmation)

**Constat de code important :** contrairement à ce que suggère le plan, `match_confidence === 'ambiguous'` n'est **pas traité différemment** de `'none'` dans `buildEditableItems.ts:23,33,51-58` — seul `'high'` déclenche une résolution `existing`. Un item ambigu tombe automatiquement dans la branche `else` et devient une **création d'aliment neuf** (`resolution: { type: 'create_new', food: { ...energy_kcal: 0... } }`), **sans blocage de `canSubmit`** (le type n'est jamais `'unresolved'` pour un item ambigu) et **sans marquage visuel distinctif** — `FoodItemRow.tsx` affiche ce cas exactement comme un item "aucun match", carte identique aux autres. Le champ `needs_quantity_confirmation` existe dans le type (`types/capture.ts:52`) mais n'est lu nulle part dans le frontend (vérifié par recherche globale).

Concrètement : rien n'empêche l'utilisateur de taper « Confirmer » sans avoir rien corrigé, ce qui crée un doublon d'aliment à 0 kcal en base. Pour que la correction ait lieu, l'utilisateur doit *remarquer* la carte et agir volontairement :

| # | Tap réel ? | Composant / ligne | Action |
|---|---|---|---|
| 1 | Oui | `MicButton.tsx` | Démarrer l'enregistrement |
| 2 | Oui | `MicButton.tsx` | Arrêter l'enregistrement |
| — | Auto | idem scénario 1 | Upload + extraction + affichage `ValidationScreen` |
| 3 | Oui | `EditPencilButton.tsx:8-24`, appelé depuis `FoodItemRow.tsx:162` | Ouvrir l'édition de l'item ambigu (`setIsEditing`) |
| 4 | Oui | `FoodItemRow.tsx:170-180` (radio `onChange`→`setResolution`) | Sélectionner le bon candidat dans la liste |
| 5 | Oui | `ValidationScreen.tsx:179` | Tap « Confirmer » |

**Total : 5 taps**, à condition qu'un candidat correct figure déjà dans `item.candidates` (`FoodItemRow.tsx:165-182`).

**Incertitude :** si aucun candidat pertinent n'est proposé (`hasAlternatives` faux ou aucun bon candidat dans la liste), l'utilisateur doit basculer sur « Nouvel aliment (saisie manuelle) » (`FoodItemRow.tsx:201-211`, +1 tap) puis remplir au minimum 4 champs obligatoires de `NewFoodForm.tsx:11-14` (kcal, protéines, glucides, lipides) — ce n'est plus un compte de "taps" propre mais une saisie manuelle multi-champs, donc hors friction "tap" pure. Ce cas rejoint le scénario 4 ci-dessous.

---

## Scénario 3 — Séance muscu, 3 exercices × 3 séries, dictés au fur et à mesure

**Point clé, incertain par nature (pas un fait de code, une hypothèse d'usage) :** "au fur et à mesure" peut vouloir dire deux choses très différentes en termes de taps, et le code ne tranche pas à ma place :

- **Variante A — une dictée par série** (le plus réaliste en salle : on récite le nombre juste après l'avoir fait, pas en fin de séance) : chaque série est une capture indépendante. `buildEditableExerciseGroups` (`lib/buildEditableItems.ts:77-112`) ne regroupe que les `strength_items` **au sein d'une même capture** — donc chaque `ExerciseGroupCard` ne contiendra qu'1 série.
- **Variante B — une dictée par exercice**, l'utilisateur récite ses 3 séries d'un coup en fin d'exercice ("squat, 10 reps 60, encore 10 reps 60, encore 8 reps 65") : dans ce cas l'extraction produit 3 `PendingStrengthSetItem` avec le même `spoken_exercise_name`, regroupés en une seule carte (`buildEditableItems.ts:81-109`). Techniquement supporté aujourd'hui, mais dépend entièrement de la qualité de l'extraction backend (LLM) sur une phrase longue — non vérifiable statiquement depuis le frontend.

Je donne les deux comptes.

### Variante A (9 dictées indépendantes)

Chaque cycle complet = `[Nouvelle dictée]` (sauf le tout premier) + `[Démarrer]` + `[Arrêter]` + `[Confirmer]`, avec le tap « Nouvelle dictée » obligatoire (`App.tsx:151`) car `flow` repasse à `'done'` et masque le micro entre deux dictées (`App.tsx:90`).

- 1er cycle : 3 taps (démarrer, arrêter, confirmer)
- 8 cycles suivants : 4 taps chacun (nouvelle dictée, démarrer, arrêter, confirmer)

**Total : 3 + 8 × 4 = 35 taps** pour toute la séance.

### Variante B (3 dictées, une par exercice)

- 1er cycle : 3 taps
- 2 cycles suivants : 4 taps chacun

**Total : 3 + 2 × 4 = 11 taps.**

Dans les deux variantes, ajouter une série *sans* redicter (`+ ajouter une série`, `ExerciseGroupCard.tsx:86-88`) crée un **set vide** (`emptySet()`, ligne 9-11) à remplir à la main (reps, kg, RIR = jusqu'à 3 champs numériques) — ce n'est donc pas une alternative moins coûteuse que la redictée tant que la fonctionnalité "dupliquer la dernière série" (plan §4) n'existe pas.

**Ce que confirme le code par rapport au plan :** la ligne du plan "Musculation : plusieurs séries → re-décrire toute la série à chaque fois" (§2) est vérifiée dans le code — rien n'auto-préremplit une nouvelle série à partir de la précédente, et "Ajout de série = un mot" (§4) n'est pas implémenté.

---

## Scénario 4 — Correction d'un aliment mal reconnu après la première extraction

Aucune re-dictée ciblée n'existe dans le code actuel : ni `ValidationScreen.tsx` ni `FoodItemRow.tsx` n'importent `MicButton` ou `useAudioRecorder`. La correction "re-dictée corrective" proposée au §3 du plan **n'est pas implémentée** — la seule voie de correction est le formulaire manuel.

### Cas A — un bon candidat alternatif figure dans `item.candidates`

Identique au scénario 2 :

| # | Tap réel ? | Composant / ligne | Action |
|---|---|---|---|
| 1-2 | Oui | `MicButton.tsx` | Démarrer / arrêter |
| — | Auto | — | Upload + extraction + `ValidationScreen` |
| 3 | Oui | `EditPencilButton.tsx` | Ouvrir l'édition |
| 4 | Oui | `FoodItemRow.tsx:170-180` | Sélectionner le bon candidat |
| 5 | Oui | `ValidationScreen.tsx:179` | Confirmer |

**Total : 5 taps.**

### Cas B — aucun bon candidat, création manuelle nécessaire (pire cas)

| # | Tap/action | Composant / ligne | Détail |
|---|---|---|---|
| 1-2 | Tap | `MicButton.tsx` | Démarrer / arrêter |
| 3 | Tap | `EditPencilButton.tsx` | Ouvrir l'édition |
| 4 | Tap | `FoodItemRow.tsx:201-211` | Radio « Nouvel aliment (saisie manuelle) » |
| 5-8+ | Saisie champ | `NewFoodForm.tsx:8-19` | Au minimum nom + kcal + protéines + glucides + lipides (4 champs marqués `required`), potentiellement +4 optionnels (AG saturés, sucres, fibres, sel) |
| 9 | Tap | `ValidationScreen.tsx:179` | Confirmer |

**Total : au moins 8 actions distinctes** (2 taps micro + 2 taps radio/pencil + 4 saisies de champs obligatoires minimum + 1 tap confirmer), potentiellement plus si l'utilisateur renseigne les champs optionnels.

**Incertitude :** je ne peux pas déterminer statiquement à quelle fréquence le cas A vs le cas B se produit — cela dépend du matching backend (score de similarité, disponibilité Open Food Facts) au moment de la capture, pas du code frontend.

---

## Pistes de réduction (dans le cadre du plan — pas de nouvelle logique métier)

### Scénario 1 (repas simple — déjà quasi minimal)
- **Rien de significatif à faire** : le tap « Confirmer » global existe déjà, c'est le plancher (3 taps) tant que le cycle démarrer/arrêter/confirmer existe. *Effort : n/a — Gain : n/a.*

### Scénario 2 (repas ambigu)
1. **Isoler visuellement l'item ambigu** (plan §3) : distinguer `match_confidence === 'ambiguous'` de `'none'` dans `buildEditableItems.ts` (nouvelle branche de résolution ou simple flag transmis à `EditableItem`), et mettre en avant la carte correspondante dans `FoodItemRow.tsx` (bordure/couleur). Ne réduit pas le nombre de taps mais évite la confirmation silencieuse d'un doublon à 0 kcal — **priorité correction avant optimisation**. *Effort : faible — Gain : élevé (évite une erreur de données, pas juste de la friction).*
2. **Remplacer le couple pencil+radio par un tap unique d'acceptation de suggestion** quand un candidat unique et net se détache (ex. score le plus haut au-dessus d'un seuil) : un bouton "Utiliser {nom du candidat} ?" directement visible sur la carte, sans passer par le mode édition. Réutilise les données déjà renvoyées (`candidates`), pas de nouvelle logique de matching. *Effort : faible-moyen — Gain : moyen (5→4 taps).*

### Scénario 3 (séance muscu)
1. **Auto-retour à l'écran de capture après confirmation** (plan §2, déjà identifié) : dans `App.tsx`, remplacer l'écran `flow==='done'` statique par un court affichage transitoire suivi d'un `reset()` automatique (`setTimeout` ou état "toast"). Supprime le tap « Nouvelle dictée » sur **chaque** cycle suivant. Impact maximal ici car c'est le scénario avec le plus de cycles répétés : Variante A passe de 35 à 3 + 8×3 = **27 taps**, Variante B de 11 à 3 + 2×3 = **9 taps**. *Effort : faible — Gain : élevé, transversal à tous les scénarios multi-captures.*
2. **Dupliquer la dernière série d'un tap** dans `ExerciseGroupCard.tsx` (bouton à côté de « + ajouter une série » qui clone `sets[sets.length-1]` au lieu d'`emptySet()`) — explicitement prévu au plan §4. Utile seulement pour la correction manuelle post-extraction, pas pour le cycle de dictée lui-même. *Effort : faible — Gain : moyen, ne joue que sur le fallback manuel.*
3. *(Hors code, à valider produit)* Encourager par le texte d'aide/placeholder à dicter toutes les séries d'un exercice en une seule prise (variante B) plutôt qu'une par série — c'est déjà supporté par `buildEditableExerciseGroups`, aucun changement de code requis, seulement un choix d'usage/copywriting. *Effort : nul — Gain : élevé si adopté (35→11 taps), mais dépend du comportement utilisateur, pas du produit.*

### Scénario 4 (correction)
1. **Implémenter la re-dictée corrective** (plan §3, déjà prévue) : ajouter un `MicButton` compact dans `FoodItemRow.tsx` qui relance une capture ciblée sur cet item et réutilise le pipeline existant (`createCapture`/extraction) au lieu du formulaire. Remplace le cas B (8+ actions) par ~2 taps (démarrer/arrêter) + auto-résolution. *Effort : moyen (nécessite que le backend accepte une correction contextuelle sur un item existant) — Gain : très élevé sur le pire cas.*
2. Même piste que scénario 2 (suggestion à un tap) pour le cas A. *Effort : faible-moyen — Gain : moyen.*

---

## Tableau récapitulatif

| Scénario | Taps actuels | Taps potentiels (optimisation la plus simple) |
|---|---|---|
| 1. Repas simple (haute confiance) | 3 | 3 (déjà minimal) |
| 2. Repas ambigu (1 item sur 3-4) | 5 | 4 (suggestion à un tap) |
| 3. Séance muscu, 3×3 séries — variante A (1 dictée/série) | 35 | 27 (auto-retour seul) |
| 3bis. Séance muscu — variante B (1 dictée/exercice) | 11 | 9 (auto-retour seul) |
| 4. Correction — cas A (bon candidat dispo) | 5 | 4 |
| 4bis. Correction — cas B (création manuelle) | 8+ actions (dont 4-8 saisies de champs) | ~2 taps (re-dictée corrective) |

**Optimisation à plus fort effet de levier, tous scénarios confondus :** supprimer le tap « Nouvelle dictée » (`App.tsx:143-157`) en auto-réinitialisant `flow` vers `idle` après un court délai — un seul changement, dans un seul fichier, qui réduit la friction de **chaque** cycle de capture répété, avec l'effet le plus visible sur l'entraînement (scénario 3).
