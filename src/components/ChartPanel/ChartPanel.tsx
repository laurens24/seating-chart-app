import { useState } from 'react'
import { FloorPlan } from './FloorPlan'
import { TableList } from './TableList'
import { SuggestModal } from '../SuggestModal'
import { useStore } from '../../store/useStore'
import { resolveConflicts } from '../../engine/suggest'
import { findTableConflicts, hasGuestPlusOneConflict } from '../../engine/conflicts'
import { OnToast } from '../../types'

interface Props {
  onToast: OnToast
}

interface ConflictItem {
  type: 'apart' | 'plus-one'
  guestAName: string
  guestBName: string
  tableName: string
}

export function ChartPanel({ onToast }: Props) {
  const [tab, setTab] = useState<'floorplan' | 'tablelist'>('floorplan')
  const [showSuggest, setShowSuggest] = useState(false)
  const [showConflictHelp, setShowConflictHelp] = useState(false)
  const [showConflicts, setShowConflicts] = useState(false)
  const { guests, relationships, tables, applyMoves, defaultTableCapacity } = useStore()

  const hasConflicts =
    tables.some((t) => findTableConflicts(t.id, guests, relationships).length > 0) ||
    guests.some((g) => g.tableId !== null && hasGuestPlusOneConflict(g.id, guests, relationships))

  const getConflictList = (): ConflictItem[] => {
    const items: ConflictItem[] = []
    const seen = new Set<string>()
    for (const table of tables) {
      const conflicts = findTableConflicts(table.id, guests, relationships)
      for (const r of conflicts) {
        const key = [r.guestAId, r.guestBId].sort().join(':')
        if (seen.has(key)) continue
        seen.add(key)
        items.push({
          type: r.type as 'apart' | 'plus-one',
          guestAName: guests.find((g) => g.id === r.guestAId)?.name ?? r.guestAId,
          guestBName: guests.find((g) => g.id === r.guestBId)?.name ?? r.guestBId,
          tableName: table.name,
        })
      }
    }
    return items
  }

  const handleFixConflicts = () => {
    const { moves, newTables, tableRenames, resolutions } = resolveConflicts(guests, relationships, tables, defaultTableCapacity)
    if (moves.length === 0) {
      onToast('info', 'No conflicts to resolve.')
      return
    }
    applyMoves(moves, newTables, tableRenames)
    onToast(
      'info',
      `Resolved ${resolutions.length} conflict${resolutions.length !== 1 ? 's' : ''}.`,
      { persistent: true, details: resolutions },
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shrink-0">
        <button
          onClick={() => setTab('floorplan')}
          className={`btn ${tab === 'floorplan' ? 'bg-violet-700 text-white' : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'}`}
        >
          Floor Plan
        </button>
        <button
          onClick={() => setTab('tablelist')}
          className={`btn ${tab === 'tablelist' ? 'bg-violet-700 text-white' : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'}`}
        >
          Table List
        </button>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setShowConflicts(true)}
            disabled={!hasConflicts}
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Show Conflicts
          </button>
          {hasConflicts && (
            <div
              className="relative"
              onMouseEnter={() => setShowConflictHelp(true)}
              onMouseLeave={() => setShowConflictHelp(false)}
            >
              <button onClick={handleFixConflicts} className="btn-danger">
                ⚡ Fix Conflicts
              </button>
              {showConflictHelp && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-stone-200 rounded-lg shadow-xl p-3 z-50 text-left">
                  <div className="text-sm font-semibold text-stone-900 mb-1">What is a conflict?</div>
                  <p className="text-xs text-stone-600 mb-2">
                    A conflict is a seating problem in your current chart:
                  </p>
                  <ul className="text-xs text-stone-600 space-y-1.5 list-disc pl-4">
                    <li>
                      <strong className="text-red-600">Apart:</strong> two guests marked “should sit apart” are at the same table.
                    </li>
                    <li>
                      <strong className="text-pink-600">Plus-one split:</strong> a guest and their plus-one are at different tables (or one is seated while the other isn’t).
                    </li>
                  </ul>
                  <p className="text-xs text-stone-500 mt-2">
                    Click <strong>Fix Conflicts</strong> to move guests to resolve these issues automatically.
                  </p>
                </div>
              )}
            </div>
          )}
          <button onClick={() => setShowSuggest(true)} className="btn-primary">
            ✨ Suggest Seating
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'floorplan' ? <FloorPlan /> : <TableList />}
      </div>
      {showSuggest && <SuggestModal onClose={() => setShowSuggest(false)} />}
      {showConflicts && (
        <div className="modal-backdrop" onClick={() => setShowConflicts(false)}>
          <div className="modal-panel max-w-md w-full mx-4 max-h-[80vh] flex flex-col animate-modal-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Current Conflicts</h2>
              <button onClick={() => setShowConflicts(false)} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-xl leading-none">✕</button>
            </div>
            {(() => {
              const conflicts = getConflictList()
              if (conflicts.length === 0) return (
                <p className="text-sm text-stone-500 dark:text-stone-400">No conflicts found.</p>
              )
              return (
                <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                  {conflicts.map((c, i) => (
                    <div key={i} className="bg-stone-100 dark:bg-stone-700 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${c.type === 'apart' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300'}`}>
                          {c.type === 'apart' ? 'Apart' : 'Plus-one'}
                        </span>
                        <span className="text-xs text-stone-500 dark:text-stone-400">{c.tableName}</span>
                      </div>
                      <p className="text-sm text-stone-800 dark:text-stone-200">
                        {c.type === 'apart'
                          ? `${c.guestAName} and ${c.guestBName} should sit apart but are at the same table.`
                          : `${c.guestAName} and ${c.guestBName} are plus-ones but seated at different tables.`}
                      </p>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
