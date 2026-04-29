import { useState } from 'react'
import { Table } from '../../types'
import { useStore } from '../../store/useStore'
import { findTableConflicts } from '../../engine/conflicts'
import { TableEditor } from './TableEditor'

interface Props { table: Table }

export function TableRow({ table }: Props) {
  const { guests, relationships, unassignGuest } = useStore()
  const [expanded, setExpanded] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const seated = guests.filter((g) => g.tableId === table.id)
  const conflicts = findTableConflicts(table.id, guests, relationships)

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden mb-2">
      <div
        className="flex items-center gap-3 px-3 py-2 bg-gray-800 cursor-pointer hover:bg-gray-750"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-sm font-semibold text-gray-100 flex-1">{table.name}</span>
        <span className="text-xs text-gray-400">{seated.length}/{table.capacity}</span>
        {conflicts.length > 0 && (
          <span title={conflicts.map((c) => {
            const a = guests.find((g) => g.id === c.guestAId)?.name
            const b = guests.find((g) => g.id === c.guestBId)?.name
            return `${a} & ${b} should be apart`
          }).join('; ')} className="text-red-400 text-sm">⚠</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setShowEditor((v) => !v) }}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Edit
        </button>
        <span className="text-gray-500 text-xs">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="px-3 py-2 bg-gray-850 flex flex-wrap gap-1">
          {seated.length === 0 && <span className="text-xs text-gray-500">No guests assigned.</span>}
          {seated.map((g) => (
            <span key={g.id} className="flex items-center gap-1 text-xs bg-gray-700 text-gray-200 px-2 py-0.5 rounded-full">
              {g.name}
              <button
                onClick={() => unassignGuest(g.id)}
                className="text-gray-500 hover:text-red-400 ml-0.5"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      {showEditor && <div className="relative px-3 pb-3"><TableEditor table={table} onClose={() => setShowEditor(false)} /></div>}
    </div>
  )
}
