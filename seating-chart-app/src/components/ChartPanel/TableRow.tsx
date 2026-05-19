import { useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Table, Guest } from '../../types'
import { useStore } from '../../store/useStore'
import { findTableConflicts, hasGuestPlusOneConflict } from '../../engine/conflicts'

function SeatedGuestPill({ guest, guests, relationships, hoveredGuestId }: {
  guest: Guest
  guests: Guest[]
  relationships: ReturnType<typeof useStore.getState>['relationships']
  hoveredGuestId: string | null
}) {
  const { unassignGuest, setHoveredGuestId } = useStore()
  const plusOneConflict = hasGuestPlusOneConflict(guest.id, guests, relationships)
  const isHighlighted = hoveredGuestId === guest.id

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `seated-${guest.id}`,
    data: { guestId: guest.id },
  })

  return (
    <span
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      title={plusOneConflict ? `${guest.name} is separated from their plus-one` : undefined}
      onMouseEnter={() => setHoveredGuestId(guest.id)}
      onMouseLeave={() => setHoveredGuestId(null)}
      style={{ opacity: isDragging ? 0.4 : 1, cursor: 'grab' }}
      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full select-none transition-colors
        ${isHighlighted ? 'bg-violet-600 text-white ring-1 ring-violet-500' : 'bg-stone-200 text-stone-800'}`}
    >
      {guest.name}
      {plusOneConflict && <span className="text-pink-400">⚠</span>}
      <button
        onClick={(e) => { e.stopPropagation(); unassignGuest(guest.id) }}
        onPointerDown={(e) => e.stopPropagation()}
        className="text-stone-500 hover:text-red-400 ml-0.5"
      >
        ✕
      </button>
    </span>
  )
}

interface Props { table: Table }

export function TableRow({ table }: Props) {
  const { guests, relationships, updateTable, removeTable, hoveredGuestId } = useStore()
  const [expanded, setExpanded] = useState(true)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(table.name)
  const [isEditingCap, setIsEditingCap] = useState(false)
  const [editCap, setEditCap] = useState(String(table.capacity))

  const commitRename = () => {
    updateTable(table.id, { name: editName.trim() || table.name })
    setIsEditingName(false)
  }

  const commitCapacity = () => {
    const n = parseInt(editCap, 10)
    if (!isNaN(n) && n > 0) updateTable(table.id, { capacity: n })
    setIsEditingCap(false)
  }

  const seated = guests.filter((g) => g.tableId === table.id)
  const conflicts = findTableConflicts(table.id, guests, relationships)
  const isOverCapacity = seated.length > table.capacity
  const isFull = seated.length === table.capacity && table.capacity > 0

  const { setNodeRef, isOver } = useDroppable({
    id: `tablelist-drop-${table.id}`,
    data: { tableId: table.id },
  })

  return (
    <div ref={setNodeRef} className={`border rounded-lg overflow-hidden flex flex-col ${isOver ? 'border-green-500' : isFull ? 'border-green-700' : 'border-stone-200'}`}>
      {/* Card header */}
      <div
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer shrink-0 ${isOver ? 'bg-green-50' : isFull ? 'bg-green-50 hover:bg-green-50/60' : 'bg-stone-100 hover:bg-stone-100'}`}
        onClick={() => setExpanded((v) => !v)}
      >
        {isEditingName ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setIsEditingName(false) }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm font-semibold bg-white text-stone-900 rounded px-1 focus:outline-none focus:ring-1 focus:ring-violet-500 min-w-0"
          />
        ) : (
          <span
            className="text-sm font-semibold text-stone-900 flex-1 truncate cursor-text"
            onDoubleClick={(e) => { e.stopPropagation(); setEditName(table.name); setIsEditingName(true) }}
          >{table.name}</span>
        )}
        {isEditingCap ? (
          <input
            autoFocus
            value={editCap}
            onChange={(e) => setEditCap(e.target.value)}
            onBlur={commitCapacity}
            onKeyDown={(e) => { if (e.key === 'Enter') commitCapacity(); if (e.key === 'Escape') setIsEditingCap(false) }}
            onClick={(e) => e.stopPropagation()}
            className="w-12 text-xs text-center bg-white text-stone-900 rounded px-1 focus:outline-none focus:ring-1 focus:ring-violet-500 shrink-0"
          />
        ) : (
          <span
            className={`text-xs shrink-0 cursor-text ${isOverCapacity ? 'text-orange-400 font-semibold' : 'text-stone-500'}`}
            onDoubleClick={(e) => { e.stopPropagation(); setEditCap(String(table.capacity)); setIsEditingCap(true) }}
          >{seated.length}/{table.capacity}</span>
        )}
        {isOverCapacity && <span title="Over capacity" className="text-orange-400 text-sm shrink-0">⚠</span>}
        {conflicts.length > 0 && (
          <span
            title={conflicts.map((c) => {
              const a = guests.find((g) => g.id === c.guestAId)?.name
              const b = guests.find((g) => g.id === c.guestBId)?.name
              return `${a} & ${b} should be apart`
            }).join('; ')}
            className="text-red-400 text-sm shrink-0"
          >⚠</span>
        )}
        <span className="text-stone-400 text-xs shrink-0">{expanded ? '▲' : '▼'}</span>
        <button
          onClick={(e) => { e.stopPropagation(); removeTable(table.id) }}
          title="Delete table"
          className="text-stone-400 hover:text-red-400 text-xs leading-none shrink-0 ml-1"
        >
          ✕
        </button>
      </div>
      {/* Guest list */}
      {expanded && (
        <div className="px-3 py-2 bg-stone-50 flex flex-wrap gap-1 min-h-[2rem]">
          {seated.length === 0 && <span className="text-xs text-stone-300 self-center">No guests assigned.</span>}
          {seated.map((g) => (
            <SeatedGuestPill
              key={g.id}
              guest={g}
              guests={guests}
              relationships={relationships}
              hoveredGuestId={hoveredGuestId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
