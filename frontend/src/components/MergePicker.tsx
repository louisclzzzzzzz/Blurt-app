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
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-sm">
            « <span className="font-medium">{sourceName}</span> » sera <span className="text-danger">supprimé</span>{' '}
            et son historique rattaché à « <span className="font-medium">{target.name}</span> ».
          </p>
          <p className="text-xs text-ink-muted mt-2">Cette action est irréversible.</p>
          {error && <p className="text-sm text-danger mt-2">{error}</p>}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setTarget(null)}
            className="flex-1 rounded-full border border-border py-3 text-sm font-medium press-effect"
          >
            Retour
          </button>
          <button
            type="button"
            onClick={confirmMerge}
            disabled={busy}
            className="flex-1 rounded-full bg-danger text-white py-3 text-sm font-medium disabled:opacity-40 press-effect"
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
      <p className="text-sm text-ink-muted">
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
          className="flex-1 rounded-full border border-border bg-surface-muted px-4 py-2 text-sm"
        />
        <button
          type="button"
          onClick={runSearch}
          className="rounded-full bg-accent text-white px-4 py-2 text-sm font-medium press-effect"
        >
          Chercher
        </button>
      </div>

      {error && <p className="text-sm text-danger text-center">{error}</p>}

      <div className="flex flex-col gap-2">
        {results.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setTarget(r)}
            className="text-left text-sm rounded-2xl border border-border bg-surface px-4 py-3 press-effect"
          >
            {r.name}
          </button>
        ))}
      </div>
    </div>
  )
}
