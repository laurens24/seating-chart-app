import { useStore } from '../../store/useStore'
import { TableRow } from './TableRow'

export function TableList() {
  const { tables, addTable } = useStore()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {tables.length === 0 && (
          <p className="text-sm text-stone-400 text-center mt-8">No tables yet. Add one below.</p>
        )}
        <div className="grid grid-cols-4 gap-3">
          {tables.map((table) => (
            <TableRow key={table.id} table={table} />
          ))}
        </div>
      </div>
      <div className="px-3 py-3 border-t border-stone-200 shrink-0">
        <button onClick={addTable} className="btn-primary w-full py-2">+ Add Table</button>
      </div>
    </div>
  )
}
