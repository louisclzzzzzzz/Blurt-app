import { useState } from 'react'
import { mergeActivities, mergeExercises, mergeFoods, searchActivities, searchExercises, searchFoods } from '../api/client'
import type { CatalogueDomain } from './CatalogueScreen'
import { HeaderWithBack } from './HeaderWithBack'

interface MergePickerProps {
  domain: CatalogueDomain
  sourceId: string
  sourceName: string
  onMerged: () => void
  onCancel: () => void
}

interface Candidate {
  id: string
  name: string
}

function searchFor(domain: CatalogueDomain) {
  if (domain === 'food') return searchFoods
  if (domain === 'exercise') return searchExercises
  return searchActivities
}

function mergeFor(domain: CatalogueDomain) {
  if (domain === 'food') return mergeFoods
  if (domain === 'exercise') return mergeExercises
  return mergeActivities
}

export function MergePicker({ domain, sourceId, sourceName, onMerged, onCancel }: MergePickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Candidate[]>([])
  const [target, setTarget] = useState<Candidate | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runSearch = () => {
    searchFor(domain)(query)
      .then((r) => setResults(r.filter((item) => item.id !== sourceId)))
      .catch(() => setError('Échec de la recherche.'))
  }

  const confirmMerge = async () => {
    if (target === null) return
    setBusy(true)
    setError(null)
    try {
      await mergeFor(domain)(sourceId, target.id)
      onMerged()
    } catch {
      setError('Échec de la fusion.')
      setBusy(false)
    }
  }

  if (target !== null) {
    return (
      <div className="flex flex-col gap-4 w-full max-w-md px-4 py-4">
        <HeaderWithBack title="Confirmer la fusion" onBack={() => setTarget(null)} />
        <div className="mobile-card">
          <p className="text-sm">
            « <span className="font-medium">{sourceName}</span> » sera <span className="text-red-500">supprimé</span>{' '}
            et son historique rattaché à « <span className="font-medium">{target.name}</span> ».
          </p>
          <p className="text-xs text-neutral-500 mt-2">Cette action est irréversible.</p>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setTarget(null)}
            className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-600 py-3 text-sm press-effect"
          >
            Retour
          </button>
          <button
            type="button"
            onClick={confirmMerge}
            disabled={busy}
            className="flex-1 rounded-lg bg-red-600 text-white py-3 text-sm disabled:opacity-40 press-effect"
          >
            {busy ? 'Fusion...' : 'Confirmer la fusion'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-md px-4 py-4">
      <HeaderWithBack title={`Fusionner "${sourceName}"`} onBack={onCancel} />
      <p className="text-sm text-neutral-500">
        Choisis la fiche à conserver — « {sourceName} » sera supprimé et rattaché à celle-ci.
      </p>

      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runSearch()
          }}
          placeholder="Rechercher la fiche cible..."
          className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={runSearch}
          className="rounded-lg bg-neutral-200 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm press-effect"
        >
          Chercher
        </button>
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      <div className="flex flex-col gap-2">
        {results.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setTarget(r)}
            className="text-left text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-3 mobile-card press-effect"
          >
            {r.name}
          </button>
        ))}
      </div>
    </div>
  )
}
