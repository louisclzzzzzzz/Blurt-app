# Plan d'action — Friction minimale & Univers graphique (Vox)

## Vision

Deux objectifs qui se renforcent plutôt qu'ils ne se concurrencent :
1. **Friction quasi nulle** pour enregistrer un repas ou une séance — l'utilisateur parle, l'app comprend, point.
2. **Univers graphique fort** (druide, forêt, parchemin) qui rend l'attente et la confirmation agréables plutôt que pénibles.

Pas de fonctionnalités d'entraînement avancées (pas de périodisation, pas de détection de superset, pas d'analytics poussés). L'énergie de dev va vers la fluidité de capture et le rendu visuel, pas vers la sophistication fonctionnelle.

---

## 1. Le principe clé : friction perçue ≠ friction réelle

Deux leviers distincts, à traiter séparément :
- **Friction réelle** : nombre d'actions (taps, écrans, champs) entre "je parle" et "c'est enregistré".
- **Friction perçue** : ce que l'utilisateur ressent pendant les 1-3 secondes de traitement (transcription → extraction → matching). Un temps d'attente identique paraît plus court s'il est habillé (le druide qui écrit sur son parchemin) que s'il est un spinner générique.

Le personnage à 4 états (idle, listening, processing, confirmation) est déjà pensé pour ça — il faut le brancher précisément sur le flux de capture, pas seulement comme décor du dashboard.

---

## 2. Audit du flux actuel

D'après l'état d'avancement du projet, la mécanique "jamais redemander" (alias appris) et le traitement "ambiguë = haute confiance" pour les aliments réduisent déjà beaucoup de friction. Ce qui reste à challenger :

| Étape | Friction actuelle | Piste de réduction |
|---|---|---|
| Lancer une capture | Ouvrir l'app, trouver le bouton | Bouton unique et unique écran d'accueil, pas de navigation avant de parler |
| Attente traitement | Temps mort (Voxtral + extraction + matching) | Habiller avec l'état "processing" du druide, pas un loader neutre |
| Écran de validation | Un item ambigu bloque toute la liste | Valider en un tap ce qui est en haute confiance, isoler visuellement le seul item à trancher |
| Correction d'un item | Formulaire d'édition manuel | Permettre une re-dictée ciblée ("non, plutôt deux tranches") plutôt que taper |
| Musculation : plusieurs séries | Re-décrire toute la série à chaque fois | Dupliquer la dernière série d'un tap, ajuster seulement ce qui change |
| Retour au flux normal | Écran de confirmation qui reste affiché | Auto-retour à l'écran de capture après un court délai, sans action requise |

---

## 3. Actions — Repas

- **Un seul geste pour valider un repas simple** : si toutes les correspondances sont en haute confiance, un bouton "Tout confirmer" visible en haut de `ValidationScreen`, sans avoir à faire défiler chaque `FoodItemRow`.
- **Isoler visuellement l'exception** : sur un repas de 4 aliments dont 1 seul est ambigu, ne pas présenter 4 blocs identiques — mettre en avant uniquement celui qui a besoin d'un choix (bordure amber flame, les autres en style "déjà accepté" grisé/coché).
- **Re-dictée corrective** : au lieu d'un formulaire pour corriger une quantité ou un aliment mal reconnu, permettre d'appuyer sur le micro et de redire juste la correction ("en fait c'est deux yaourts") — réutilise le pipeline existant plutôt que de construire une UI d'édition parallèle.
- **Capture multi-aliments en une phrase** : déjà géré par l'extraction structurée — s'assurer que l'UI de validation scale bien visuellement à 5-6 items sans devenir un mur de formulaires (cartes compactes, une ligne par aliment quand la confiance est haute).

## 4. Actions — Entraînement

- **Pas d'écran "créer une séance"** : la séance se crée toute seule (regroupement 3h déjà en place) — l'utilisateur ne voit jamais un formulaire de séance, seulement le résultat de ce qu'il a dicté.
- **Ajout de série = un mot** : "encore une série, même poids" doit suffire à dupliquer la dernière série de l'exercice en cours, sans repasser par une phrase complète.
- **Poids/reps/RIR restent facultatifs** partout dans l'UI (déjà le cas) — ne jamais forcer un champ vide à être rempli avant de continuer.
- **Fin de séance implicite** : pas de bouton "terminer ma séance", elle se ferme d'elle-même après la fenêtre d'inactivité — cohérent avec l'objectif zéro-friction.

## 5. Ce qu'on ne fait volontairement PAS

Pour protéger le temps de dev vers friction + visuel plutôt que vers la richesse fonctionnelle :
- Pas de graphes de progression avancés (1RM estimé, courbes de charge, etc.) au-delà d'un chiffre simple si besoin plus tard.
- Pas de détection automatique de superset.
- Pas de plans d'entraînement / périodisation / programmes préétablis.
- Pas de gamification (badges, streaks, classements) en V1.
- Pas de personnalisation poussée de l'écran de validation (thèmes, réordonnancement manuel).

Chaque idée qui sort de cette liste pendant le dev doit être posée à côté, pas intégrée sans revalider l'arbitrage.

---

## 6. Univers graphique — où investir en priorité

L'identité visuelle (`DA.md`) est déjà solide. La priorité n'est pas d'en faire plus, mais de la concentrer là où elle réduit la friction perçue :

1. **Les 4 états du druide, animés sur le flux de capture réel** — c'est l'écran vu à chaque usage, donc celui qui a le plus de valeur par minute de travail investie. Une transition fluide idle → listening → processing → confirmation vaut plus que dix nouveaux décors.
2. **Micro-feedback pendant "processing"** : quelque chose qui bouge sur le parchemin (une ligne qui s'écrit progressivement) donne une sensation de progrès même si le vrai temps de traitement ne bouge pas.
3. **Icônes du dashboard** : travail déjà engagé (8 icônes, pipeline chroma key) — à finir avant de commencer autre chose, pour ne pas avoir un dashboard à moitié fini visuellement.
4. **Décor de fond (forêt) en un seul asset réutilisable**, pas un par écran — cohérent avec la recommandation PNG optimisé déjà actée, et ça évite un chantier d'assets qui grossit sans fin.
5. **Rings de progression et barres (macros, volume)** : les techniques déjà choisies (SVG segments, `clip-path`) sont les bonnes — pas besoin de sprites custom ici, l'énergie graphique doit aller sur le personnage, pas sur les jauges.

Animation du personnage (WebM/GIF) reste un chantier futur explicitement scoppé plus tard — mais le point 1 ci-dessus peut démarrer avec des transitions CSS entre images fixes en attendant, sans bloquer sur l'animation complète.

---

## 7. Feuille de route proposée

1. **Cartographier le flux actuel en nombre de taps réels** (repas simple, repas ambigu, séance de 3 exercices) — mesure de référence avant optimisation.
2. **Écran de capture + états du druide branchés en premier** — c'est l'écran à plus fort usage, et ça sert à la fois friction perçue et univers graphique.
3. **"Tout confirmer" + isolement visuel de l'exception sur `ValidationScreen`** (repas).
4. **Duplication de série en un tap** (entraînement).
5. **Finir les 8 icônes dashboard déjà en cours**, avant nouveau chantier graphique.
6. **Re-mesurer le nombre de taps** sur les mêmes scénarios qu'à l'étape 1, comparer.
7. Seulement ensuite : décor de fond, polish additionnel.

## 8. Comment savoir si ça marche

- **Nombre de taps** pour enregistrer un repas simple / un repas ambigu / une séance — cible : minimum absolu, à mesurer avant/après.
- **Temps entre "je lance la capture" et "c'est enregistré"**, ressenti utilisateur en conditions réelles (cohérent avec la méthode de vérification déjà utilisée sur le projet).
- **Taux de repas/séances validés sans aucune correction manuelle** — indicateur indirect que le matching + la confiance sont bien calibrés, donc que l'UI n'a pas besoin d'intervenir.
