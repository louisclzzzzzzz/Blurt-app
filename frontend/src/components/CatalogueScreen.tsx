import { useEffect, useState } from 'react'
import { searchActivities, searchExercises, searchFoods } from '../api/client'
import type { ActivityTypeRead, ExerciseRead, FoodRead } from '../types/catalogue'
import { CatalogueEntryDetail } from './CatalogueEntryDetail'
import { HeaderWithBack } from './HeaderWithBack'
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

  useEffect(() => {
    runSearch(domain, query)
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
    <div className="flex flex-col gap-4 w-full max-w-md px-4 py-4">
      <HeaderWithBack title="Catalogue" onBack={onClose} />

      <SegmentedTabs
        options={(Object.keys(DOMAIN_LABELS) as CatalogueDomain[]).map((d) => ({ value: d, label: DOMAIN_LABELS[d] }))}
        value={domain}
        onChange={switchDomain}
      />

      {domain === 'food' && (
        <SegmentedTabs options={FOOD_SUB_TABS} value={foodSubTab} onChange={switchFoodSubTab} />
      )}

      <div className="flex gap-3">
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
          className="rounded-lg bg-neutral-200 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm press-effect"
        >
          Chercher
        </button>
      </div>

      {loading && <p className="text-sm text-neutral-500 animate-pulse text-center py-4">Recherche...</p>}
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      <div className="flex flex-col gap-2">
        {results.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedId(r.id)}
            className="text-left text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-3 mobile-card press-effect"
          >
            {r.name}
          </button>
        ))}
        {!loading && results.length === 0 && <p className="text-sm text-neutral-500 text-center py-4">Aucun résultat.</p>}
      </div>
    </div>
  )
}
