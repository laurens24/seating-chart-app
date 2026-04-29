import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useStore } from '../../store/useStore'
import { TableShape } from './TableShape'

export function FloorPlan() {
  const { tables, updateTable, assignGuest, addTable } = useStore()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event

    // Moving a table
    if (String(active.id).startsWith('table-') && !String(active.id).startsWith('table-drop-')) {
      const tableId = (active.data.current as { tableId: string }).tableId
      const table = tables.find((t) => t.id === tableId)
      if (table) {
        updateTable(tableId, {
          position: {
            x: Math.max(0, table.position.x + delta.x),
            y: Math.max(0, table.position.y + delta.y),
          },
        })
      }
      return
    }

    // Dropping a guest onto a table
    if (over && String(over.id).startsWith('table-drop-')) {
      const guestId = active.id as string
      const tableId = (over.data.current as { tableId: string }).tableId
      assignGuest(guestId, tableId)
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="relative w-full h-full bg-gray-950 overflow-hidden">
        <div
          className="absolute inset-4 border border-dashed border-gray-700 rounded"
          style={{ minHeight: 400 }}
        />
        {tables.map((table) => (
          <TableShape key={table.id} table={table} />
        ))}
        <button
          onClick={addTable}
          className="absolute bottom-4 right-4 px-3 py-1.5 text-sm bg-violet-700 text-white rounded hover:bg-violet-600"
        >
          + Add Table
        </button>
      </div>
    </DndContext>
  )
}
