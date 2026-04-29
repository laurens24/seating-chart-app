import { useState } from 'react'
import { Table } from '../../types'
import { useStore } from '../../store/useStore'

interface Props {
  table: Table
  onClose: () => void
}

export function TableEditor({ table, onClose }: Props) {
  const { updateTable, removeTable } = useStore()
  const [name, setName] = useState(table.name)
  const [capacity, setCapacity] = useState(String(table.capacity))
  const [shape, setShape] = useState<'round' | 'rectangular'>(table.shape)

  const save = () => {
    const cap = parseInt(capacity, 10)
    if (!name.trim() || isNaN(cap) || cap < 1) return
    updateTable(table.id, { name: name.trim(), capacity: cap, shape })
    onClose()
  }

  return (
    <div className="absolute z-20 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 w-48"
      style={{ top: table.position.y + 60, left: table.position.x - 20 }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-gray-100 mb-2 focus:outline-none focus:border-violet-500"
      />
      <div className="flex gap-2 mb-2">
        <input
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="w-16 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-violet-500"
        />
        <select
          value={shape}
          onChange={(e) => setShape(e.target.value as 'round' | 'rectangular')}
          className="flex-1 text-sm bg-gray-700 border border-gray-600 rounded text-gray-200 px-1"
        >
          <option value="round">Round</option>
          <option value="rectangular">Rect</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={save} className="flex-1 py-1 text-xs bg-violet-600 text-white rounded hover:bg-violet-700">Save</button>
        <button onClick={() => { removeTable(table.id); onClose() }} className="py-1 px-2 text-xs bg-red-900/50 text-red-400 rounded hover:bg-red-900">Del</button>
        <button onClick={onClose} className="py-1 px-2 text-xs text-gray-400 hover:text-white">✕</button>
      </div>
    </div>
  )
}
