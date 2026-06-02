import { ConflictResolution } from '../types'

interface Props {
  resolutions: ConflictResolution[]
  onClose: () => void
}

const typeBadge: Record<ConflictResolution['type'], { label: string; cls: string }> = {
  'apart': { label: 'Apart', cls: 'bg-red-100 text-red-700' },
  'plus-one': { label: 'Plus-one', cls: 'bg-pink-100 text-pink-700' },
}

export function ConflictResolutionsModal({ resolutions, onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel max-w-lg w-full max-h-[80vh] flex flex-col animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">Conflicts Resolved</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
          {resolutions.length} {resolutions.length === 1 ? 'change was' : 'changes were'} made to your seating.
        </p>
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 mb-4">
          {resolutions.map((r, i) => {
            const badge = typeBadge[r.type]
            const description = r.type === 'apart'
              ? `${r.guestAName} and ${r.guestBName} were at the same table but are marked to sit apart.`
              : `${r.guestAName} and ${r.guestBName} are a plus-one pair but were seated separately.`
            const fix = r.fromTableName
              ? `${r.guestBName} ${r.action}: ${r.fromTableName} → ${r.toTableName}`
              : `${r.guestBName} ${r.action} → ${r.toTableName}`
            return (
              <div key={i} className="bg-stone-100 dark:bg-stone-700 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <span className="text-xs text-stone-500">Conflict {i + 1}</span>
                </div>
                <p className="text-sm text-stone-800">{description}</p>
                <p className="text-xs text-stone-600 mt-1">{fix}</p>
              </div>
            )
          })}
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="btn-primary">Close</button>
        </div>
      </div>
    </div>
  )
}
