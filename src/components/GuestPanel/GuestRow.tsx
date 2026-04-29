// src/components/GuestPanel/GuestRow.tsx
import { useDraggable } from '@dnd-kit/core'
import { Guest } from '../../types'
import { findTableConflicts } from '../../engine/conflicts'
import { useStore } from '../../store/useStore'

interface Props {
  guest: Guest
  isSelected: boolean
  onSelect: (id: string) => void
}

export function GuestRow({ guest, isSelected, onSelect }: Props) {
  const { relationships, guests } = useStore()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: guest.id,
    data: { guestId: guest.id },
  })

  const hasConflict =
    guest.tableId !== null &&
    findTableConflicts(guest.tableId, guests, relationships).some(
      (r) => r.guestAId === guest.id || r.guestBId === guest.id
    )

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(guest.id)}
      className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer select-none
        ${isDragging ? 'opacity-40' : ''}
        ${isSelected ? 'bg-violet-900/50 border border-violet-600' : 'hover:bg-gray-800'}
      `}
    >
      <span className="text-sm font-medium text-gray-100 flex-1 truncate">{guest.name}</span>
      {guest.tableId && <span className="text-xs text-gray-500">assigned</span>}
      {hasConflict && <span title="Conflict at table" className="text-red-400 text-xs">⚠</span>}
      <div className="flex gap-1 flex-wrap">
        {guest.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="text-xs bg-violet-800/50 text-violet-300 px-1.5 py-0.5 rounded">
            {tag}
          </span>
        ))}
        {guest.tags.length > 2 && (
          <span className="text-xs text-gray-500">+{guest.tags.length - 2}</span>
        )}
      </div>
    </div>
  )
}
