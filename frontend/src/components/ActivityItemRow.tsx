import type { ActivityResolution, EditableActivityItem } from '../types/capture'

interface ActivityItemRowProps {
  item: EditableActivityItem
  onChange: (updated: EditableActivityItem) => void
  onRemove: () => void
}

export function ActivityItemRow({ item, onChange, onRemove }: ActivityItemRowProps) {
  if (item.removed) return null

  const groupName = `activity-${item.spoken_activity_name}`
  const setResolution = (resolution: ActivityResolution) => onChange({ ...item, resolution })
  const selectedActivityId = item.resolution.type === 'existing' ? item.resolution.activityTypeId : null
  const isCreatingNew = item.resolution.type === 'create_new'

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{item.spoken_activity_name}</p>
        <button type="button" onClick={onRemove} className="text-xs text-danger shrink-0">
          Retirer
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <label className="text-sm flex items-center gap-2">
          Durée (min)
          <input
            type="number"
            value={item.durationMinutes ?? ''}
            onChange={(e) =>
              onChange({
                ...item,
                durationMinutes: e.target.value === '' ? null : Number(e.target.value),
              })
            }
            className="w-20 rounded-lg border border-border bg-surface-muted px-2 py-1"
          />
        </label>
        <label className="text-sm flex items-center gap-2">
          Distance (km)
          <input
            type="number"
            value={item.distanceKm ?? ''}
            onChange={(e) =>
              onChange({ ...item, distanceKm: e.target.value === '' ? null : Number(e.target.value) })
            }
            className="w-20 rounded-lg border border-border bg-surface-muted px-2 py-1"
          />
        </label>
      </div>

      {item.candidates.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-ink-muted">
            Correspondance{item.candidates.length > 1 ? 's possibles' : ''} :
          </p>
          {item.candidates.map((c) => (
            <label key={c.activity_type_id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={groupName}
                checked={selectedActivityId === c.activity_type_id}
                onChange={() => setResolution({ type: 'existing', activityTypeId: c.activity_type_id })}
              />
              {c.name}
            </label>
          ))}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="radio"
          name={groupName}
          checked={isCreatingNew}
          onChange={() => setResolution({ type: 'create_new' })}
        />
        Nouvelle activité : « {item.spoken_activity_name} »
      </label>
    </div>
  )
}
