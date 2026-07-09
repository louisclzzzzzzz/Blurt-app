import { useEffect, useState } from 'react'
import { searchActivities, searchExercises, searchFoods } from '../api/client'
import type { ActivityTypeRead, ExerciseRead, FoodRead } from '../types/catalogue'
import { CatalogueEntryDetail } from './CatalogueEntryDetail'
import { SegmentedTabs } from './SegmentedTabs'

export type CatalogueDomain = 'food' | 'exercise' | 'activity'
type ListItem = FoodRead | ExerciseRead | ActivityTypeRead

interface CatalogueScreenProps {
  onClose: () => void
}

const DOMAIN_LABELS: Record<CatalogueDomain, string> = {
  food: 'Aliments',
  exercise: 'Exercices',
  activity: 'Activités',
}

type FoodSubTab = 'custom' | 'ciqual'

const FOOD_SUB_TABS: { value: FoodSubTab; label: string }[] = [
  { value: 'custom', label: 'Créés' },
  { value: 'ciqual', label: 'De base' },
]

export function CatalogueScreen({ onClose }: CatalogueScreenProps) {
  const [domain, setDomain] = useState<CatalogueDomain>('food')
  const [foodSubTab, setFoodSubTab] = useState<FoodSubTab>('custom')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const runSearch = (d: CatalogueDomain, q: string, sub: FoodSubTab = foodSubTab) => {
    setLoading(true)
    setError(null)
    const request =
      d === 'food' ? searchFoods(q, sub) : d === 'exercise' ? searchExercises(q) : searchActivities(q)
    request
      .then(setResults)
      .catch(() => setError('Échec de la recherche.'))
      .finally(() => setLoading(false))
  }

  // Recherche initiale au montage uniquement — les recherches suivantes sont
  // déclenchées explicitement (changement d'onglet, Entrée, bouton).
  useEffect(() => {
    runSearch(domain, query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const switchDomain = (d: CatalogueDomain) => {
    setDomain(d)
    setQuery('')
    setSelectedId(null)
    runSearch(d, '')
  }

  const switchFoodSubTab = (sub: FoodSubTab) => {
    setFoodSubTab(sub)
    setQuery('')
    setSelectedId(null)
    runSearch('food', '', sub)
  }

  if (selectedId !== null) {
    return (
      <CatalogueEntryDetail
        domain={domain}
        entryId={selectedId}
        onBack={() => {
          setSelectedId(null)
          runSearch(domain, query)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-md px-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Catalogue</h2>
        <button type="button" onClick={onClose} className="text-xs text-neutral-400 underline">
          Fermer
        </button>
      </div>

      <SegmentedTabs
        options={(Object.keys(DOMAIN_LABELS) as CatalogueDomain[]).map((d) => ({ value: d, label: DOMAIN_LABELS[d] }))}
        value={domain}
        onChange={switchDomain}
      />

      {domain === 'food' && (
        <SegmentedTabs options={FOOD_SUB_TABS} value={foodSubTab} onChange={switchFoodSubTab} />
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runSearch(domain, query)
          }}
          placeholder="Rechercher..."
          className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => runSearch(domain, query)}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm"
        >
          Chercher
        </button>
      </div>

      {loading && <p className="text-sm text-neutral-500 animate-pulse">Recherche...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex flex-col gap-1">
        {results.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedId(r.id)}
            className="text-left text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2"
          >
            {r.name}
          </button>
        ))}
        {!loading && results.length === 0 && <p className="text-sm text-neutral-500">Aucun résultat.</p>}
      </div>
    </div>
  )
}
