import { useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Table, Guest } from '../../types'
import { findTableConflicts, hasGuestPlusOneConflict } from '../../engine/conflicts'
import { useStore } from '../../store/useStore'
import { ConflictTooltip } from '../ConflictTooltip'

const LABEL_ORBIT = 64
const FOOTPRINT_HALF = LABEL_ORBIT + 20

function SeatedGuestLabel({ guest, angle, tableId, guests, relationships, hoveredTag, hoveredGuestId, setHoveredGuestId }: {
  guest: Guest
  angle: number
  tableId: string
  guests: Guest[]
  relationships: ReturnType<typeof useStore.getState>['relationships']
  hoveredTag: string | null
  hoveredGuestId: string | null
  setHoveredGuestId: (id: string | null) => void
}) {
  const plusOneConflict = hasGuestPlusOneConflict(guest.id, guests, relationships)
  const isTagHighlighted = hoveredTag !== null && guest.tags.includes(hoveredTag)
  const isGuestHighlighted = hoveredGuestId === guest.id
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `seated-${guest.id}`,
    data: { guestId: guest.id, fromTableId: tableId },
  })

  const rad = (angle * Math.PI) / 180
  const orbitX = Math.round(Math.cos(rad) * LABEL_ORBIT)
  const orbitY = Math.round(Math.sin(rad) * LABEL_ORBIT)

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      title={plusOneConflict ? `${guest.name} – separated from plus-one` : guest.name}
      onMouseEnter={() => setHoveredGuestId(guest.id)}
      onMouseLeave={() => setHoveredGuestId(null)}
      style={{
        position: 'absolute',
        left: FOOTPRINT_HALF + orbitX,
        top: FOOTPRINT_HALF + orbitY,
        transform: 'translate(-50%, -50%)',
        opacity: isDragging ? 0.3 : 1,
        cursor: 'grab',
        zIndex: 10,
        width: 'min-content',
      }}
      className={`text-xs px-1 rounded select-none pointer-events-auto leading-tight transition-colors text-center
        ${isTagHighlighted || isGuestHighlighted ? 'text-white bg-violet-600 ring-1 ring-violet-500' : 'text-stone-800 bg-white/90'}`}
    >
      {guest.name}
      {plusOneConflict && (
        <ConflictTooltip
          lines={[{ color: '#f472b6', prefix: '+1', text: `${guest.name} is separated from their plus-one` }]}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="text-pink-400 ml-0.5">⚠</span>
        </ConflictTooltip>
      )}
    </div>
  )
}

interface Props {
  table: Table
}

export function TableShape({ table }: Props) {
  const { guests, relationships, hoveredTag, hoveredGuestId, setHoveredGuestId, updateTable, removeTable, removeTables, selectedTableIds, setSelectedTableIds, tableGroupDragDelta } = useStore()
  const isSelected = selectedTableIds.has(table.id)
  const isMultiSelected = isSelected && selectedTableIds.size > 1
  const [isHovered, setIsHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
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
  const hasConflict = conflicts.length > 0
  const isOverCapacity = seated.length > table.capacity
  const isFull = seated.length === table.capacity && table.capacity > 0

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `table-drop-${table.id}`,
    data: { tableId: table.id },
  })

  const { attributes, listeners, setNodeRef: setDragRef, isDragging, transform } = useDraggable({
    id: `table-${table.id}`,
    data: { type: 'table', tableId: table.id },
  })

  // When part of a group drag (another selected table is being dragged), apply the group delta
  const groupDelta = isSelected && !isDragging && tableGroupDragDelta ? tableGroupDragDelta : null
  const x = table.position.x + (transform?.x ?? 0) + (groupDelta?.x ?? 0)
  const y = table.position.y + (transform?.y ?? 0) + (groupDelta?.y ?? 0)

  const isRound = table.shape === 'round'
  const w = isRound ? 72 : 88
  const h = isRound ? 72 : 56

  const angles = seated.map((_, i) => -90 + (360 / Math.max(seated.length, 1)) * i)
  const footprint = (LABEL_ORBIT + 20) * 2

  return (
    <div
      data-table-shape
      style={{
        position: 'absolute',
        left: x - (footprint - w) / 2,
        top: y - (footprint - h) / 2,
        width: footprint,
        height: footprint,
        opacity: isDragging ? 0.5 : 1,
        pointerEvents: 'none',
      }}
    >
      <div
        ref={(node) => { setDragRef(node); setDropRef(node) }}
        {...attributes}
        {...listeners}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { if (!confirmDelete) setIsHovered(false) }}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: w,
          height: h,
          transform: 'translate(-50%, -50%)',
          borderRadius: isRound ? '50%' : '6px',
          pointerEvents: 'auto',
        }}
        className={`flex flex-col items-center justify-center border-2 select-none relative
          ${isOver ? 'border-green-400 bg-green-50' : isOverCapacity ? 'border-orange-400 bg-orange-50' : hasConflict ? 'border-red-500 bg-red-50' : isFull ? 'border-green-600 bg-green-50' : 'border-violet-600 bg-violet-50'}
          ${isSelected ? 'ring-2 ring-violet-400 ring-offset-1' : ''}
        `}
      >
        {isHovered && !confirmDelete && (
          <button
            title="Delete table"
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: 'absolute', top: -6, right: -6 }}
            className="w-5 h-5 rounded-full bg-stone-200 hover:bg-red-700 flex items-center justify-center text-stone-600 hover:text-white text-xs leading-none shadow"
          >
            ✕
          </button>
        )}
        {isEditingName ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setIsEditingName(false) }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full text-xs font-bold text-center bg-transparent text-stone-800 focus:outline-none focus:underline px-1"
          />
        ) : (
          <span
            className="text-xs font-bold text-stone-800 leading-tight text-center px-1 break-words w-full text-center cursor-text"
            onDoubleClick={(e) => { e.stopPropagation(); setEditName(table.name); setIsEditingName(true) }}
          >
            {table.name}
          </span>
        )}
        {isEditingCap ? (
          <input
            autoFocus
            value={editCap}
            onChange={(e) => setEditCap(e.target.value)}
            onBlur={commitCapacity}
            onKeyDown={(e) => { if (e.key === 'Enter') commitCapacity(); if (e.key === 'Escape') setIsEditingCap(false) }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-8 text-xs text-center bg-white text-stone-900 rounded focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        ) : (
          <span
            className={`text-xs cursor-text ${isOverCapacity ? 'text-orange-400 font-semibold' : 'text-stone-500'}`}
            onDoubleClick={(e) => { e.stopPropagation(); setEditCap(String(table.capacity)); setIsEditingCap(true) }}
          >
            {seated.length}/{table.capacity}
          </span>
        )}
        <button
          title={`Switch to ${isRound ? 'rectangular' : 'round'}`}
          onClick={(e) => { e.stopPropagation(); updateTable(table.id, { shape: isRound ? 'rect' : 'round' }) }}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-stone-400 hover:text-stone-600 leading-none"
        >
          {isRound
            ? <svg width="10" height="8" viewBox="0 0 10 8"><rect x="0.5" y="0.5" width="9" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>
            : <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>
          }
        </button>
        {isOverCapacity && <span title="Over capacity" className="text-orange-400 text-xs">⚠</span>}
        {!isOverCapacity && hasConflict && (
          <ConflictTooltip
            lines={conflicts.map((r) => {
              const a = guests.find((g) => g.id === r.guestAId)?.name ?? r.guestAId
              const b = guests.find((g) => g.id === r.guestBId)?.name ?? r.guestBId
              return r.type === 'apart'
                ? { color: '#f87171', prefix: '✗', text: `${a} & ${b} should be apart` }
                : { color: '#f472b6', prefix: '+1', text: `${a} & ${b} are split up` }
            })}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span className="text-red-400 text-xs">⚠</span>
          </ConflictTooltip>
        )}
      </div>

      {seated.map((g, i) => (
        <SeatedGuestLabel
          key={g.id}
          guest={g}
          angle={angles[i]}
          tableId={table.id}
          guests={guests}
          relationships={relationships}
          hoveredTag={hoveredTag}
          hoveredGuestId={hoveredGuestId}
          setHoveredGuestId={setHoveredGuestId}
        />
      ))}
      {confirmDelete && (
        <>
          <div
            onClick={() => { setConfirmDelete(false); setIsHovered(false) }}
            style={{ position: 'fixed', inset: 0, zIndex: 49, pointerEvents: 'auto' }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 50, whiteSpace: 'nowrap', pointerEvents: 'auto' }}
            className="bg-white border border-stone-200 rounded-lg shadow-xl px-3 py-2 flex flex-col items-center gap-2"
          >
          <span className="text-xs text-stone-800">
            {isMultiSelected ? `Delete ${selectedTableIds.size} tables?` : `Delete ${table.name}?`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => { setConfirmDelete(false); setIsHovered(false) }}
              className="text-xs px-2 py-0.5 rounded bg-stone-200 text-stone-600 hover:bg-stone-300"
            >
              Cancel
            </button>
            {isMultiSelected && (
              <button
                onClick={() => { removeTable(table.id); setSelectedTableIds(new Set()) }}
                className="text-xs px-2 py-0.5 rounded bg-stone-400 text-white hover:bg-stone-500"
              >
                Just this one
              </button>
            )}
            <button
              onClick={() => {
                if (isMultiSelected) {
                  removeTables([...selectedTableIds])
                  setSelectedTableIds(new Set())
                } else {
                  removeTable(table.id)
                }
              }}
              className="text-xs px-2 py-0.5 rounded bg-red-700 text-white hover:bg-red-600"
            >
              {isMultiSelected ? `Delete all ${selectedTableIds.size}` : 'Delete'}
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  )
}
