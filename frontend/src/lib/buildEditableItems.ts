import type {
  ActivityResolution,
  CaptureCreateResponse,
  EditableActivityItem,
  EditableExerciseGroup,
  EditableItem,
  ExerciseResolution,
  ItemResolution,
} from '../types/capture'

export function buildEditableItems(response: CaptureCreateResponse): EditableItem[] {
  return response.food_items.map((item) => {
    let resolution: ItemResolution = { type: 'unresolved' }
    let quantityGrams = item.quantity_grams
    let quantityUnits = item.quantity_units

    // La transcription est fiable : on ne propose jamais une liste de "did you
    // mean" par défaut. Confiance "haute" (match quasi exact) -> on lie
    // directement à l'aliment connu. Sinon ("ambiguë" ou "none") -> on part du
    // principe que c'est un nouvel aliment plutôt que de deviner parmi des
    // candidats incertains. Dans tous les cas, l'icône d'édition dans
    // FoodItemRow permet de corriger à la main si ce n'est pas la bonne résolution.
    if (item.match_confidence === 'high' && item.candidates[0]) {
      resolution = { type: 'existing', foodItemId: item.candidates[0].food_item_id }
      const portion = item.candidates[0].default_portion_grams
      // Aucun poids dicté mais une portion usuelle connue (ex: "1 pomme" = 180g) :
      // on assume le nombre d'unités dicté (ou 1 par défaut, ex: "une pomme") et
      // on calcule le poids correspondant plutôt que de le demander.
      if (quantityGrams === null && portion !== null) {
        if (quantityUnits === null) quantityUnits = 1
        quantityGrams = quantityUnits * portion
      }
    } else if (item.dictated_macros) {
      // Macros dictées : le backend ne renvoie aucun candidat pour ces items
      // (ni DB ni OFF) — toujours une création directe, jamais un choix.
      resolution = {
        type: 'create_new',
        food: {
          name: item.spoken_name,
          is_packaged: item.is_packaged_product,
          energy_kcal: item.dictated_macros.energy_kcal,
          protein_g: item.dictated_macros.protein_g,
          carbs_g: item.dictated_macros.carbs_g,
          fat_g: item.dictated_macros.fat_g,
          saturated_fat_g: item.dictated_macros.saturated_fat_g,
          sugars_g: item.dictated_macros.sugars_g,
          fiber_g: item.dictated_macros.fiber_g,
          salt_g: item.dictated_macros.salt_g,
        },
      }
    } else {
      // Pas de match exact : nouvel aliment par défaut, à corriger à la main
      // via l'icône d'édition si l'utilisateur voulait en fait un aliment existant.
      resolution = {
        type: 'create_new',
        food: { name: item.spoken_name, is_packaged: item.is_packaged_product, energy_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      }
    }

    return {
      spoken_name: item.spoken_name,
      quantity_description: item.quantity_description,
      is_packaged_product: item.is_packaged_product,
      dictated_macros: item.dictated_macros,
      candidates: item.candidates,
      off_candidates: item.off_candidates,
      removed: false,
      quantityGrams,
      quantityUnits,
      resolution,
    }
  })
}

/** Regroupe les séries dictées par exercice (une carte par exercice, pas par série) :
 * une même correspondance/création s'applique à toutes les séries d'un même exercice. */
export function buildEditableExerciseGroups(response: CaptureCreateResponse): EditableExerciseGroup[] {
  const groups: EditableExerciseGroup[] = []
  const indexByName = new Map<string, number>()

  for (const item of response.strength_items) {
    const key = item.spoken_exercise_name.trim().toLowerCase()
    let groupIndex = indexByName.get(key)

    if (groupIndex === undefined) {
      let resolution: ExerciseResolution = { type: 'unresolved' }
      if (item.match_confidence === 'high' && item.candidates[0]) {
        resolution = { type: 'existing', exerciseId: item.candidates[0].exercise_id }
      } else if (item.match_confidence === 'none') {
        // Aucun candidat : création automatique, pas de confirmation nécessaire (cf. plan).
        resolution = { type: 'create_new' }
      }
      groupIndex = groups.length
      indexByName.set(key, groupIndex)
      groups.push({
        spoken_exercise_name: item.spoken_exercise_name,
        candidates: item.candidates,
        resolution,
        sets: [],
        removed: false,
        metEstimate: item.met_estimate,
      })
    }

    groups[groupIndex].sets.push({ reps: item.reps, weightKg: item.weight_kg, rir: item.rir })
  }

  return groups
}

export function buildEditableActivityItems(response: CaptureCreateResponse): EditableActivityItem[] {
  return response.activity_items.map((item) => {
    let resolution: ActivityResolution = { type: 'unresolved' }
    if (item.match_confidence === 'high' && item.candidates[0]) {
      resolution = { type: 'existing', activityTypeId: item.candidates[0].activity_type_id }
    } else if (item.match_confidence === 'none') {
      // Aucun candidat : création automatique, pas de confirmation nécessaire (cf. plan).
      resolution = { type: 'create_new' }
    }

    return {
      spoken_activity_name: item.spoken_activity_name,
      candidates: item.candidates,
      resolution,
      durationMinutes: item.duration_minutes,
      distanceKm: item.distance_km,
      removed: false,
      metEstimate: item.met_estimate,
    }
  })
}
