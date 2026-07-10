# Réorganisation en tableaux de bord

Principe : chaque onglet de la nav du bas est un **tableau de bord** — un
écran qui ne fait que présenter des boutons vers les vraies fonctionnalités.
Seul l'onglet **Accueil** déroge à la règle : il n'a qu'un seul bouton (la
dictée), pas de tableau de bord.

Aujourd'hui, Nutrition/Entraînement/Catalogue utilisent des `SegmentedTabs`
qui affichent déjà le contenu d'un onglet par défaut. On passe à : d'abord un
écran de choix (boutons), puis on entre dans la fonctionnalité choisie (avec
son propre bouton retour vers le tableau de bord, pas directement vers
Accueil).

## Accueil

Inchangé — déjà conforme.

- **Bouton unique** : micro (dictée). L'input texte ("Simuler") reste un
  filet de secours discret, pas un vrai second bouton de nav.

## Nutrition — tableau de bord à créer

Remplace le `SegmentedTabs` actuel (`NutritionScreen.tsx`) par un écran de
boutons, puis chaque bouton ouvre l'écran correspondant (déjà existant pour
la plupart, juste déplacé derrière un bouton) :

| Bouton | Écran cible | Statut |
|---|---|---|
| **Repas du jour** | Liste des repas du jour + navigation veille/lendemain (`HistoryMealCard`, contenu actuel de l'onglet "Repas") | Existe déjà, à déplacer derrière un bouton |
| **Macros & calories** | Récapitulatif calories/protéines/glucides/lipides (`NutritionSummary`, contenu actuel de l'onglet "Récapitulatif") | Existe déjà, à déplacer derrière un bouton |
| **Objectifs nutritionnels** *(nouveau)* | Formulaire des objectifs (calories/protéines/glucides/lipides par jour) | Existe mais planqué dans `ProfileSettings` — à sortir dans son propre écran, accessible aussi depuis Nutrition |

## Entraînement — tableau de bord à créer

Remplace le `SegmentedTabs` actuel (`TrainingScreen.tsx`) :

| Bouton | Écran cible | Statut |
|---|---|---|
| **Séances du jour** | Séances de muscu + activités cardio du jour, navigation veille/lendemain (`HistoryWorkoutCard` + `HistoryActivityLogRow`, contenu actuel de l'onglet "Séances") | Existe déjà, à déplacer derrière un bouton |
| **Volume hebdomadaire** | Graphe calories brûlées/semaine + volume par groupe musculaire (contenu actuel de l'onglet "Volume") | Existe déjà, à déplacer derrière un bouton |

## Catalogue — tableau de bord à créer

Remplace le `SegmentedTabs` de domaine (`CatalogueScreen.tsx`) :

| Bouton | Écran cible | Statut |
|---|---|---|
| **Aliments** | Recherche + liste (sous-onglets "Créés"/"De base" conservés à l'intérieur de cet écran) | Existe déjà, à déplacer derrière un bouton |
| **Exercices** | Recherche + liste | Existe déjà, à déplacer derrière un bouton |
| **Activités** | Recherche + liste | Existe déjà, à déplacer derrière un bouton |

Chaque item de liste ouvre déjà `CatalogueEntryDetail` (fiche détail/édition) —
ça ne change pas.

## Profil

Inchangé — un profil (bio + objectifs) est déjà un écran unique cohérent, pas
plusieurs destinations distinctes. Seule modif : si "Objectifs nutritionnels"
devient aussi accessible depuis Nutrition (voir tableau ci-dessus), factoriser
ce formulaire dans un composant partagé plutôt que de le dupliquer.

## Modèle de navigation

`App.tsx` gère aujourd'hui un seul niveau d'écran (`Screen` = capture |
profile | training | nutrition | catalogue). Il faut un second niveau pour
les sous-écrans, par exemple :

```ts
type Screen = 'capture' | 'profile' | 'training' | 'nutrition' | 'catalogue'

type NutritionSubScreen = 'meals' | 'summary' | 'goals'
type TrainingSubScreen = 'sessions' | 'volume'
type CatalogueSubScreen = 'food' | 'exercise' | 'activity'
```

Chaque écran de tableau de bord (`NutritionScreen`, `TrainingScreen`,
`CatalogueScreen`) garde un `useState` local pour son sous-écran actif
(`null` = dashboard, sinon le sous-écran choisi) plutôt que de tout remonter
dans `App.tsx` — cohérent avec le pattern déjà utilisé par `CatalogueScreen`
pour `selectedId` (détail catalogue).

## Composant à créer : `DashboardScreen`

Un composant réutilisable pour éviter de dupliquer la mise en page des trois
tableaux de bord :

```tsx
interface DashboardButtonDef {
  key: string
  label: string
  description?: string   // ex. "3 repas aujourd'hui"
  icon: string           // emoji ou chemin d'image pixel-art
  onClick: () => void
}

interface DashboardScreenProps {
  title: string
  onBack: () => void
  buttons: DashboardButtonDef[]
}
```

Rendu : `HeaderWithBack` + grille (1 ou 2 colonnes) de gros boutons carrés,
chacun avec icône + label + éventuellement une valeur en direct (ex. nombre
de séries faites aujourd'hui, calories déjà loggées) pour que le tableau de
bord serve aussi de coup d'œil rapide, pas juste un menu texte.

## Fichiers à créer/modifier

- `frontend/src/components/DashboardScreen.tsx` *(nouveau)* — composant
  partagé grille de boutons.
- `frontend/src/components/NutritionScreen.tsx` — devient un dashboard avec 3
  boutons (Repas / Macros & calories / Objectifs), sous-écrans actuels
  déplacés dans des composants dédiés si besoin (`NutritionMealsScreen`,
  `NutritionSummaryScreen` ou gardés inline).
- `frontend/src/components/TrainingScreen.tsx` — devient un dashboard avec 2
  boutons (Séances / Volume).
- `frontend/src/components/CatalogueScreen.tsx` — devient un dashboard avec 3
  boutons (Aliments / Exercices / Activités), la recherche+liste actuelle
  devient l'écran affiché après clic.
- `frontend/src/components/NutritionGoalsForm.tsx` *(nouveau, optionnel)` —
  si on factorise le formulaire d'objectifs pour le partager entre Profil et
  Nutrition.

## Ordre d'implémentation suggéré

1. `DashboardScreen` (composant générique, sans logique métier).
2. Catalogue (le plus simple : 3 boutons vers du contenu qui ne bouge pas de
   place, juste un niveau de clic en plus).
3. Entraînement (2 boutons, idem, contenu inchangé).
4. Nutrition (3 boutons, avec l'extraction du formulaire d'objectifs — un peu
   plus de travail que les deux précédents).
