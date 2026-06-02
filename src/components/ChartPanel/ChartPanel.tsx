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

export function ChartPanel({ onToast }: Props) {
  const [tab, setTab] = useState<'floorplan' | 'tablelist'>('floorplan')
  const [showSuggest, setShowSuggest] = useState(false)
  const [showConflictHelp, setShowConflictHelp] = useState(false)
  const { guests, relationships, tables, applyMoves, defaultTableCapacity } = useStore()

  const hasConflicts =
    tables.some((t) => findTableConflicts(t.id, guests, relationships).length > 0) ||
    guests.some((g) => g.tableId !== null && hasGuestPlusOneConflict(g.id, guests, relationships))

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
    </div>
  )
}
