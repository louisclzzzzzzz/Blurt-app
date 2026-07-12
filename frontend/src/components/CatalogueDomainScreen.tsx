import { useEffect, useState } from 'react'
import { searchActivities, searchExercises, searchFoods } from '../api/client'
import type { ActivityTypeRead, ExerciseRead, FoodRead } from '../types/catalogue'
import type { CatalogueDomain } from './CatalogueScreen'
import { CatalogueEntryDetail } from './CatalogueEntryDetail'
import { HeaderWithBack } from './HeaderWithBack'
import { SegmentedTabs } from './SegmentedTabs'

type ListItem = FoodRead | ExerciseRead | ActivityTypeRead

interface CatalogueDomainScreenProps {
  domain: CatalogueDomain
  title: string
  onBack: () => void
}

type FoodSubTab = 'custom' | 'ciqual'

const FOOD_SUB_TABS: { value: FoodSubTab; label: string }[] = [
  { value: 'custom', label: 'Créés' },
  { value: 'ciqual', label: 'De base' },
]

export function CatalogueDomainScreen({ domain, title, onBack }: CatalogueDomainScreenProps) {
  const [foodSubTab, setFoodSubTab] = useState<FoodSubTab>('custom')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const runSearch = (q: string, sub: FoodSubTab = foodSubTab) => {
    setLoading(true)
    setError(null)
    const request =
      domain === 'food' ? searchFoods(q, sub) : domain === 'exercise' ? searchExercises(q) : searchActivities(q)
    request
      .then(setResults)
      .catch(() => setError('Échec de la recherche.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    runSearch(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const switchFoodSubTab = (sub: FoodSubTab) => {
    setFoodSubTab(sub)
    setQuery('')
    setSelectedId(null)
    runSearch('', sub)
  }

  if (selectedId !== null) {
    return (
      <CatalogueEntryDetail
        domain={domain}
        entryId={selectedId}
        onBack={() => {
          setSelectedId(null)
          runSearch(query)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-md px-4 py-4">
      <HeaderWithBack title={title} onBack={onBack} />

      {domain === 'food' && (
        <SegmentedTabs options={FOOD_SUB_TABS} value={foodSubTab} onChange={switchFoodSubTab} />
      )}

      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runSearch(query)
          }}
          placeholder="Rechercher..."
          className="flex-1 rounded-full border border-border bg-surface-muted px-4 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => runSearch(query)}
          className="rounded-full bg-accent text-white px-4 py-2 text-sm font-medium press-effect"
        >
          Chercher
        </button>
      </div>

      {loading && <p className="text-sm text-ink-muted animate-pulse text-center py-4">Recherche...</p>}
      {error && <p className="text-sm text-danger text-center">{error}</p>}

      <div className="flex flex-col gap-2">
        {results.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedId(r.id)}
            className="text-left text-sm rounded-2xl border border-border bg-surface px-4 py-3 press-effect"
          >
            {r.name}
          </button>
        ))}
        {!loading && results.length === 0 && <p className="text-sm text-ink-muted text-center py-4">Aucun résultat.</p>}
      </div>
    </div>
  )
}
