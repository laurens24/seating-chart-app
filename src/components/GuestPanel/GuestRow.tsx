// src/components/GuestPanel/GuestRow.tsx
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Guest } from '../../types'
import { findTableConflicts } from '../../engine/conflicts'
import { useStore } from '../../store/useStore'
import { ConflictTooltip } from '../ConflictTooltip'
import { getTagColor } from '../../utils/tagColors'

function TagPill({ tag, guestId }: { tag: string; guestId: string }) {
  const { setHoveredTag } = useStore()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tag-${guestId}-${tag}`,
    data: { type: 'tag', tag },
  })
  const color = getTagColor(tag)
  return (
    <span
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onMouseEnter={(e) => { e.stopPropagation(); setHoveredTag(tag) }}
      onMouseLeave={() => setHoveredTag(null)}
      onClick={(e) => e.stopPropagation()}
      style={{ opacity: isDragging ? 0.4 : 1, cursor: 'grab' }}
      className={`text-xs px-1.5 py-0.5 rounded select-none ${color.bg} ${color.text} ${color.hover}`}
    >
      {tag}
    </span>
  )
}

function highlightMatch(text: string, term: string) {
  if (!term) return text
  const idx = text.toLowerCase().indexOf(term.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-700 text-inherit rounded-sm px-0.5">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  )
}

interface Props {
  guest: Guest
  isSelected: boolean
  onSelect: (id: string) => void
  onCheck?: (id: string, shiftKey: boolean) => void
  isPlusOne: boolean
  isMultiSelect: boolean
  isChecked: boolean
  searchTerm?: string
}

export function GuestRow({ guest, isSelected, onSelect, onCheck, isPlusOne, isMultiSelect, isChecked, searchTerm }: Props) {
  const { relationships, guests, hoveredGuestId, setHoveredGuestId } = useStore()
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: guest.id,
    data: { guestId: guest.id },
  })
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `guest-drop-${guest.id}`,
    data: { guestId: guest.id },
  })

  const hasConflict =
    guest.tableId !== null &&
    findTableConflicts(guest.tableId, guests, relationships).some(
      (r) => r.guestAId === guest.id || r.guestBId === guest.id
    )

  const isGuestHighlighted = hoveredGuestId === guest.id

  const plusOnePartnerName = (() => {
    const rel = relationships.find(
      (r) => r.type === 'plus-one' && (r.guestAId === guest.id || r.guestBId === guest.id)
    )
    if (!rel) return null
    const partnerId = rel.guestAId === guest.id ? rel.guestBId : rel.guestAId
    return guests.find((g) => g.id === partnerId)?.name ?? null
  })()

  return (
    <div
      ref={(node) => { setDragRef(node); setDropRef(node) }}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(guest.id)}
      onMouseEnter={() => setHoveredGuestId(guest.id)}
      onMouseLeave={() => setHoveredGuestId(null)}
      className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer select-none
        ${isDragging ? 'opacity-40' : ''}
        ${isOver ? 'bg-pink-900/40 border border-pink-500' : isChecked ? 'bg-violet-100 border border-violet-500' : isSelected ? 'bg-violet-100 border border-violet-500' : isGuestHighlighted ? 'bg-green-50/60 border border-violet-500' : 'hover:bg-stone-100 dark:hover:bg-stone-700'}
        transition-all duration-150
      `}
    >
      {isMultiSelect && (
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => onCheck?.(guest.id, (e.nativeEvent as MouseEvent).shiftKey)}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="accent-violet-500 shrink-0"
        />
      )}
      <span className="text-sm font-medium text-stone-900 dark:text-stone-100 flex-1 break-words min-w-0">
          {searchTerm ? highlightMatch(guest.name, searchTerm) : guest.name}
        </span>
      {isPlusOne && plusOnePartnerName && (
        <ConflictTooltip
          lines={[{ color: '#f472b6', prefix: '+1', text: plusOnePartnerName }]}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="text-pink-400 text-xs font-bold shrink-0">+1</span>
        </ConflictTooltip>
      )}
      {isPlusOne && !plusOnePartnerName && (
        <span className="text-pink-400 text-xs font-bold shrink-0">+1</span>
      )}
      {guest.tableId && <span className="text-xs text-stone-400">assigned</span>}
      {hasConflict && <span title="Conflict at table" className="text-red-400 text-xs">⚠</span>}
      <div className="flex gap-1 flex-wrap">
        {guest.tags.slice(0, 2).map((tag) => (
          <TagPill key={tag} tag={tag} guestId={guest.id} />
        ))}
        {guest.tags.length > 2 && (
          <span className="text-xs text-stone-400">+{guest.tags.length - 2}</span>
        )}
      </div>
    </div>
  )
}
