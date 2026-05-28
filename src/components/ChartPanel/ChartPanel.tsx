import { useState } from 'react'
import { FloorPlan } from './FloorPlan'
import { TableList } from './TableList'
import { SuggestModal } from '../SuggestModal'
import { useStore } from '../../store/useStore'
import { resolveConflicts } from '../../engine/suggest'
import { findTableConflicts, hasGuestPlusOneConflict } from '../../engine/conflicts'

interface Props {
  onToast: (type: 'info' | 'warning' | 'error', message: string) => void
}

export function ChartPanel({ onToast }: Props) {
  const [tab, setTab] = useState<'floorplan' | 'tablelist'>('floorplan')
  const [showSuggest, setShowSuggest] = useState(false)
  const { guests, relationships, tables, applyMoves, defaultTableCapacity } = useStore()

  const hasConflicts =
    tables.some((t) => findTableConflicts(t.id, guests, relationships).length > 0) ||
    guests.some((g) => g.tableId !== null && hasGuestPlusOneConflict(g.id, guests, relationships))

  const handleFixConflicts = () => {
    const { moves, newTables } = resolveConflicts(guests, relationships, tables, defaultTableCapacity)
    if (moves.length === 0) {
      onToast('info', 'No conflicts to resolve.')
      return
    }
    applyMoves(moves, newTables)
    onToast('info', `Resolved ${moves.length} conflict${moves.length !== 1 ? 's' : ''}.`)
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-200 bg-white shrink-0">
        <button
          onClick={() => setTab('floorplan')}
          className={`btn ${tab === 'floorplan' ? 'bg-violet-700 text-white' : 'text-stone-500 hover:text-stone-800'}`}
        >
          Floor Plan
        </button>
        <button
          onClick={() => setTab('tablelist')}
          className={`btn ${tab === 'tablelist' ? 'bg-violet-700 text-white' : 'text-stone-500 hover:text-stone-800'}`}
        >
          Table List
        </button>
        <div className="flex gap-2 ml-auto">
          {hasConflicts && (
            <button onClick={handleFixConflicts} className="btn-danger">
              ⚡ Fix Conflicts
            </button>
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
