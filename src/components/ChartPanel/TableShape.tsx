import { useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Table } from '../../types'
import { findTableConflicts } from '../../engine/conflicts'
import { useStore } from '../../store/useStore'
import { TableEditor } from './TableEditor'

interface Props {
  table: Table
}

export function TableShape({ table }: Props) {
  const { guests, relationships } = useStore()
  const [showEditor, setShowEditor] = useState(false)

  const seated = guests.filter((g) => g.tableId === table.id)
  const conflicts = findTableConflicts(table.id, guests, relationships)
  const hasConflict = conflicts.length > 0

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `table-drop-${table.id}`,
    data: { tableId: table.id },
  })

  const { attributes, listeners, setNodeRef: setDragRef, isDragging, transform } = useDraggable({
    id: `table-${table.id}`,
    data: { type: 'table', tableId: table.id },
  })

  const x = table.position.x + (transform?.x ?? 0)
  const y = table.position.y + (transform?.y ?? 0)

  const isRound = table.shape === 'round'
  const w = isRound ? 72 : 88
  const h = isRound ? 72 : 56

  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: isDragging ? 0.5 : 1 }}>
      <div
        ref={(node) => { setDragRef(node); setDropRef(node) }}
        {...attributes}
        {...listeners}
        onClick={(e) => { e.stopPropagation(); setShowEditor((v) => !v) }}
        style={{ borderRadius: isRound ? '50%' : '6px' }}
        className={`w-full h-full flex flex-col items-center justify-center cursor-pointer border-2
          ${isOver ? 'border-green-400 bg-green-900/30' : hasConflict ? 'border-red-500 bg-red-900/20' : 'border-violet-600 bg-violet-900/20'}
          select-none
        `}
      >
        <span className="text-xs font-bold text-gray-200 leading-tight text-center px-1 truncate w-full text-center">
          {table.name}
        </span>
        <span className="text-xs text-gray-400">{seated.length}/{table.capacity}</span>
        {hasConflict && <span className="text-red-400 text-xs">⚠</span>}
      </div>
      {showEditor && <TableEditor table={table} onClose={() => setShowEditor(false)} />}
    </div>
  )
}
