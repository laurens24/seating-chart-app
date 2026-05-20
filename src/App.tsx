import { useState, useCallback } from 'react'
import { DndContext, DragEndEvent, DragMoveEvent, DragOverEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { TopBar } from './components/TopBar'
import { GuestPanel } from './components/GuestPanel/GuestPanel'
import { ChartPanel } from './components/ChartPanel/ChartPanel'
import { Toast } from './components/Toast'
import { ToastMessage } from './types'
import { newId } from './utils/ids'
import { useStore } from './store/useStore'

const TABLE_DROP_PREFIXES = ['table-drop-', 'tablelist-drop-']
const isTableDrop = (id: string) => TABLE_DROP_PREFIXES.some((p) => id.startsWith(p))

export default function App() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [activeSeatDrag, setActiveSeatDrag] = useState<{ guestId: string; guestName: string } | null>(null)
  const [seatDragOverTable, setSeatDragOverTable] = useState(false)
  const [activeTagDrag, setActiveTagDrag] = useState<string | null>(null)

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = newId()
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id)
    if (id.startsWith('seated-')) {
      const guestId = (event.active.data.current as { guestId: string }).guestId
      const guestName = useStore.getState().guests.find((g) => g.id === guestId)?.name ?? ''
      setActiveSeatDrag({ guestId, guestName })
      setSeatDragOverTable(false)
    } else if (id.startsWith('tag-')) {
      setActiveTagDrag((event.active.data.current as { tag: string }).tag)
    }
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (!String(event.active.id).startsWith('seated-')) return
    setSeatDragOverTable(!!event.over && isTableDrop(String(event.over.id)))
  }, [])

  const handleDragCancel = useCallback(() => {
    setActiveSeatDrag(null)
    setSeatDragOverTable(false)
    setActiveTagDrag(null)
    useStore.getState().setTableGroupDragDelta(null)
  }, [])

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    if (!String(event.active.id).startsWith('table-')) return
    const { selectedTableIds, setTableGroupDragDelta } = useStore.getState()
    const tableId = (event.active.data.current as { tableId: string }).tableId
    if (selectedTableIds.size > 1 && selectedTableIds.has(tableId)) {
      setTableGroupDragDelta({ x: event.delta.x, y: event.delta.y })
    }
  }, [])

  const assignWithPlusOne = useCallback((guestId: string, tableId: string) => {
    const { guests, relationships, assignGuest, multiSelectIds } = useStore.getState()

    const toAssign = multiSelectIds.size > 1 && multiSelectIds.has(guestId)
      ? [...multiSelectIds]
      : [guestId]

    for (const id of toAssign) {
      assignGuest(id, tableId)
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

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveSeatDrag(null)
    setSeatDragOverTable(false)
    setActiveTagDrag(null)
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

    // Dragging a seated guest label — reassign or unassign
    if (String(active.id).startsWith('seated-')) {
      const guestId = (active.data.current as { guestId: string }).guestId
      if (over && (String(over.id).startsWith('table-drop-') || String(over.id).startsWith('tablelist-drop-'))) {
        const tableId = (over.data.current as { tableId: string }).tableId
        assignWithPlusOne(guestId, tableId)
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
    if (over && (String(over.id).startsWith('table-drop-') || String(over.id).startsWith('tablelist-drop-'))) {
      const guestId = active.id as string
      const tableId = (over.data.current as { tableId: string }).tableId
      assignWithPlusOne(guestId, tableId)
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
    <div className="h-screen flex flex-col bg-stone-50 text-stone-900 overflow-hidden">
      <TopBar onToast={addToast} />
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 overflow-hidden">
          <GuestPanel />
          <ChartPanel onToast={addToast} />
        </div>
        <DragOverlay dropAnimation={null}>
          {activeSeatDrag && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-lg select-none pointer-events-none whitespace-nowrap
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
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
