import { useStore } from '../../store/useStore'
import { TableRow } from './TableRow'

export function TableList() {
  const { tables, addTable } = useStore()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {tables.length === 0 && (
          <p className="text-sm text-gray-500 text-center mt-8">No tables yet. Add one below.</p>
        )}
        {tables.map((table) => (
          <TableRow key={table.id} table={table} />
        ))}
      </div>
      <div className="px-3 py-3 border-t border-gray-700 shrink-0">
        <button
          onClick={addTable}
          className="w-full py-2 text-sm bg-violet-700 text-white rounded hover:bg-violet-600"
        >
          + Add Table
        </button>
      </div>
    </div>
  )
}
