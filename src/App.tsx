import { useState, useCallback, useRef, useEffect } from 'react'
import { DndContext, DragEndEvent, DragMoveEvent, DragOverEvent, DragOverlay, DragStartEvent, PointerSensor, pointerWithin, useSensor, useSensors, type Modifier, type CollisionDetection } from '@dnd-kit/core'
import { computeOrbitInsertIndex, findSafeInsertIndex, snapToKeepPair, middleDropInsertIndex } from './engine/seating'
import { TopBar } from './components/TopBar'
import { GuestPanel } from './components/GuestPanel/GuestPanel'
import { ChartPanel } from './components/ChartPanel/ChartPanel'
import { Toast } from './components/Toast'
import { ConflictResolutionsModal } from './components/ConflictResolutionsModal'
import { ToastMessage, ConflictResolution } from './types'
import { newId } from './utils/ids'
import { useStore } from './store/useStore'

const TABLE_DROP_PREFIXES = ['table-drop-', 'tablelist-drop-', 'table-orbit-']
const isTableDrop = (id: string) => TABLE_DROP_PREFIXES.some((p) => id.startsWith(p))

// Prefer the inner table droppable over the orbit when both intersect, so dropping
// on the table icon itself does a "middle" insert rather than an orbit insert.
const prioritizeMiddleOverOrbit: CollisionDetection = (args) => {
  const collisions = pointerWithin(args)
  if (collisions.length === 0) return collisions
  const middle = collisions.filter((c) => String(c.id).startsWith('table-drop-') || String(c.id).startsWith('tablelist-drop-'))
  if (middle.length > 0) return middle
  return collisions
}

const centerUnderCursor: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  if (!draggingNodeRect || !activatorEvent) return transform
  const { clientX, clientY } = activatorEvent as PointerEvent
  return {
    ...transform,
    x: transform.x + clientX - draggingNodeRect.left - draggingNodeRect.width / 2,
    y: transform.y + clientY - draggingNodeRect.top - draggingNodeRect.height / 2,
  }
}

export default function App() {
  const darkMode = useStore((s) => s.darkMode)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [resolutionsModal, setResolutionsModal] = useState<{ resolutions: ConflictResolution[]; toastId: string } | null>(null)
  const [activeSeatDrag, setActiveSeatDrag] = useState<{ guestId: string; guestName: string } | null>(null)
  const [seatDragOverTable, setSeatDragOverTable] = useState(false)
  const [activeTagDrag, setActiveTagDrag] = useState<string | null>(null)

  const addToast = useCallback((
    type: ToastMessage['type'],
    message: string,
    options?: { persistent?: boolean; details?: ConflictResolution[] },
  ) => {
    const id = newId()
    setToasts((prev) => [...prev, { id, type, message, ...options }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const lastPointer = useRef({ x: 0, y: 0 })

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id)
    if (event.activatorEvent instanceof PointerEvent) {
      lastPointer.current = { x: event.activatorEvent.clientX, y: event.activatorEvent.clientY }
    }
    if (id.startsWith('seated-')) {
      const guestId = (event.active.data.current as { guestId: string }).guestId
      const guestName = useStore.getState().guests.find((g) => g.id === guestId)?.name ?? ''
      setActiveSeatDrag({ guestId, guestName })
      setSeatDragOverTable(false)
    } else if (id.startsWith('tag-')) {
      setActiveTagDrag((event.active.data.current as { tag: string }).tag)
    } else {
      // Plain guest row drag from the guest panel
      const guestName = useStore.getState().guests.find((g) => g.id === id)?.name ?? ''
      if (guestName) {
        setActiveSeatDrag({ guestId: id, guestName })
        setSeatDragOverTable(false)
      }
    }
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const id = String(event.active.id)
    if (!id.startsWith('seated-') && !useStore.getState().guests.some((g) => g.id === id)) return
    setSeatDragOverTable(!!event.over && isTableDrop(String(event.over.id)))
  }, [])

  const handleDragCancel = useCallback(() => {
    setActiveSeatDrag(null)
    setSeatDragOverTable(false)
    setActiveTagDrag(null)
    useStore.getState().setTableGroupDragDelta(null)
    useStore.getState().setOrbitInsertHint(null)
  }, [])

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    if (event.activatorEvent instanceof PointerEvent) {
      lastPointer.current = {
        x: event.activatorEvent.clientX + event.delta.x,
        y: event.activatorEvent.clientY + event.delta.y,
      }
    }
    const id = String(event.active.id)
    const isTableMove = id.startsWith('table-') && !id.startsWith('table-drop-') && !id.startsWith('table-orbit-')
    if (!isTableMove) return
    const { selectedTableIds, setTableGroupDragDelta } = useStore.getState()
    const tableId = (event.active.data.current as { tableId: string }).tableId
    if (selectedTableIds.size > 1 && selectedTableIds.has(tableId)) {
      setTableGroupDragDelta({ x: event.delta.x, y: event.delta.y })
    }
  }, [])

  const assignWithPlusOne = useCallback((guestId: string, tableId: string, insertIndex?: number) => {
    const { guests, relationships, assignGuest, multiSelectIds } = useStore.getState()

    const toAssign = multiSelectIds.size > 1 && multiSelectIds.has(guestId)
      ? [...multiSelectIds]
      : [guestId]

    for (const id of toAssign) {
      // The first dragged guest gets the explicit index; the rest append next to their partner.
      assignGuest(id, tableId, id === guestId ? insertIndex : undefined)
      const rel = relationships.find(
        (r) => r.type === 'plus-one' && (r.guestAId === id || r.guestBId === id)
      )
      if (rel) {
        const partnerId = rel.guestAId === id ? rel.guestBId : rel.guestAId
        if (!toAssign.includes(partnerId)) {
          const partner = guests.find((g) => g.id === partnerId)
          if (partner && partner.tableId === null) assignGuest(partnerId, tableId)
        }
      }
    }
  }, [])

  const computeDropIndex = useCallback((
    overId: string,
    tableId: string,
    guestId: string,
  ): number | undefined => {
    const { tables, relationships } = useStore.getState()
    const table = tables.find((t) => t.id === tableId)
    if (!table) return undefined
    const isSameTable = useStore.getState().guests.find((g) => g.id === guestId)?.tableId === tableId
    const existingSeats = isSameTable
      ? table.seatOrder.filter((id) => id !== guestId)
      : [...table.seatOrder]

    if (overId.startsWith('table-orbit-')) {
      // Compute angle relative to the inner table center using last pointer.
      const innerEl = document.querySelector(`[data-table-inner][data-table-id="${tableId}"]`) as HTMLElement | null
      let dx = 0, dy = 0
      if (innerEl) {
        const rect = innerEl.getBoundingClientRect()
        dx = lastPointer.current.x - (rect.left + rect.width / 2)
        dy = lastPointer.current.y - (rect.top + rect.height / 2)
      }
      const desired = computeOrbitInsertIndex(dx, dy, existingSeats.length)
      const snapped = snapToKeepPair(guestId, desired, existingSeats, relationships)
      return findSafeInsertIndex(snapped, existingSeats, relationships, isSameTable ? guestId : null)
    }
    // Middle drop / table list drop
    return middleDropInsertIndex(guestId, existingSeats, relationships)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveSeatDrag(null)
    setSeatDragOverTable(false)
    setActiveTagDrag(null)
    useStore.getState().setOrbitInsertHint(null)
    const { active, over, delta } = event

    // Dropping a tag onto a table — fill remaining seats with tagged guests + their plus-ones
    if (String(active.id).startsWith('tag-') && over && isTableDrop(String(over.id))) {
      const tag = (active.data.current as { tag: string }).tag
      const tableId = (over.data.current as { tableId: string }).tableId
      const { guests, relationships, tables, applyMoves, updateTable } = useStore.getState()
      const table = tables.find((t) => t.id === tableId)
      if (!table) return

      const seatedIds = new Set(guests.filter((g) => g.tableId === tableId).map((g) => g.id))
      let seats = table.capacity - seatedIds.size
      if (seats <= 0) return

      const apartPairs = new Set(
        relationships.filter((r) => r.type === 'apart').map((r) => `${r.guestAId}:${r.guestBId}`)
      )
      const isApart = (a: string, b: string) =>
        apartPairs.has(`${a}:${b}`) || apartPairs.has(`${b}:${a}`)

      const wouldConflict = (guestId: string, currentSeated: Set<string>) =>
        [...currentSeated].some((sid) => isApart(guestId, sid))

      // Collect unassigned guests with this tag, plus-one partners travel with them
      const tagged = guests.filter((g) => g.tableId === null && g.tags.includes(tag))
      const moves: { guestId: string; toTableId: string }[] = []
      const queued = new Set<string>()

      for (const g of tagged) {
        if (seats <= 0) break
        if (queued.has(g.id)) continue

        // Skip if this guest would create an apart conflict
        if (wouldConflict(g.id, seatedIds)) continue

        const plusOneRel = relationships.find(
          (r) => r.type === 'plus-one' && (r.guestAId === g.id || r.guestBId === g.id)
        )
        const partnerId = plusOneRel
          ? (plusOneRel.guestAId === g.id ? plusOneRel.guestBId : plusOneRel.guestAId)
          : null
        const partner = partnerId ? guests.find((p) => p.id === partnerId) : null

        // If partner is already at a different table, seating this guest here splits them — skip
        if (partner && partner.tableId !== null && partner.tableId !== tableId) continue

        const partnerUnassigned = partner && partner.tableId === null
        const pairSize = partnerUnassigned ? 2 : 1
        if (pairSize > seats) continue

        // Skip if partner would create an apart conflict
        if (partnerUnassigned && wouldConflict(partner.id, seatedIds)) continue

        moves.push({ guestId: g.id, toTableId: tableId })
        queued.add(g.id)
        seatedIds.add(g.id)
        seats -= 1

        if (partnerUnassigned) {
          moves.push({ guestId: partner.id, toTableId: tableId })
          queued.add(partner.id)
          seatedIds.add(partner.id)
          seats -= 1
        }
      }

      if (moves.length > 0) {
        applyMoves(moves)
        updateTable(tableId, { name: tag })
      }
      return
    }

    // Dragging a seated guest label — reassign, reorder, or unassign
    if (String(active.id).startsWith('seated-')) {
      const guestId = (active.data.current as { guestId: string }).guestId
      if (over && isTableDrop(String(over.id))) {
        const tableId = (over.data.current as { tableId: string }).tableId
        const fromTableId = useStore.getState().guests.find((g) => g.id === guestId)?.tableId ?? null
        const insertIndex = computeDropIndex(String(over.id), tableId, guestId)
        if (fromTableId === tableId && insertIndex !== undefined) {
          useStore.getState().reorderSeat(tableId, guestId, insertIndex)
        } else {
          assignWithPlusOne(guestId, tableId, insertIndex)
        }
      } else {
        useStore.getState().unassignGuest(guestId)
      }
      return
    }

    // Moving a table on the floor plan
    if (String(active.id).startsWith('table-') && !String(active.id).startsWith('table-drop-')) {
      const tableId = (active.data.current as { tableId: string }).tableId
      const { tables, updateTable, selectedTableIds, setTableGroupDragDelta } = useStore.getState()
      setTableGroupDragDelta(null)
      // Move all selected tables together if the dragged table is part of the selection
      const idsToMove = selectedTableIds.size > 1 && selectedTableIds.has(tableId)
        ? [...selectedTableIds]
        : [tableId]
      for (const id of idsToMove) {
        const t = tables.find((tbl) => tbl.id === id)
        if (t) {
          updateTable(id, {
            position: {
              x: Math.max(0, t.position.x + delta.x),
              y: Math.max(0, t.position.y + delta.y),
            },
          })
        }
      }
      return
    }

    // Dropping a guest onto a table (floor plan or table list)
    if (over && isTableDrop(String(over.id))) {
      const guestId = active.id as string
      const tableId = (over.data.current as { tableId: string }).tableId
      const insertIndex = computeDropIndex(String(over.id), tableId, guestId)
      assignWithPlusOne(guestId, tableId, insertIndex)
      return
    }

    // Dropping a guest onto another guest — link as plus-ones
    if (over && String(over.id).startsWith('guest-drop-')) {
      const draggedId = active.id as string
      const targetId = (over.data.current as { guestId: string }).guestId
      if (draggedId !== targetId) {
        useStore.getState().addRelationship(draggedId, targetId, 'plus-one', '')
      }
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 overflow-hidden transition-colors">
      <TopBar />
      <DndContext
        sensors={sensors}
        collisionDetection={prioritizeMiddleOverOrbit}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 overflow-hidden">
          <GuestPanel onToast={addToast} />
          <ChartPanel onToast={addToast} />
        </div>
        <DragOverlay dropAnimation={null} modifiers={activeSeatDrag ? [centerUnderCursor] : []}>
          {activeSeatDrag && (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-lg select-none pointer-events-none whitespace-nowrap w-fit
              ${seatDragOverTable
                ? 'bg-violet-600 text-white ring-1 ring-violet-500'
                : 'bg-red-700 text-white ring-1 ring-red-500'
              }`}
            >
              {!seatDragOverTable && <span className="font-bold">✕</span>}
              {activeSeatDrag.guestName}
              {seatDragOverTable && <span className="opacity-70">→</span>}
            </div>
          )}
          {activeTagDrag && (
            <span className="text-xs bg-violet-600 text-white px-1.5 py-0.5 rounded shadow-lg select-none pointer-events-none">
              {activeTagDrag}
            </span>
          )}
        </DragOverlay>
      </DndContext>
      <Toast
        toasts={toasts}
        onDismiss={dismissToast}
        onOpenDetails={(t) => { if (t.details) setResolutionsModal({ resolutions: t.details, toastId: t.id }) }}
      />
      {resolutionsModal && (
        <ConflictResolutionsModal
          resolutions={resolutionsModal.resolutions}
          onClose={() => {
            dismissToast(resolutionsModal.toastId)
            setResolutionsModal(null)
          }}
        />
      )}
    </div>
  )
}
