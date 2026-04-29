import { useState } from 'react'
import { SuggestedMove } from '../types'
import { useStore } from '../store/useStore'
import { suggestMoves } from '../engine/suggest'

interface Props {
  onClose: () => void
}

export function SuggestModal({ onClose }: Props) {
  const { guests, relationships, tables, applyMoves } = useStore()
  const [moves] = useState<SuggestedMove[]>(() =>
    suggestMoves(guests, relationships, tables)
  )
  const [index, setIndex] = useState<number | null>(null) // null = show all
  const [_skipped, setSkipped] = useState<Set<number>>(new Set())

  const guestName = (id: string) => guests.find((g) => g.id === id)?.name ?? id
  const tableName = (id: string) => tables.find((t) => t.id === id)?.name ?? id
  const tablemates = (toTableId: string) =>
    guests.filter((g) => g.tableId === toTableId).map((g) => g.name)

  const applyAll = () => {
    applyMoves(moves)
    onClose()
  }

  const startReview = () => setIndex(0)

  const acceptCurrent = () => {
    if (index === null) return
    applyMoves([moves[index]])
    const next = index + 1
    if (next >= moves.length) onClose()
    else setIndex(next)
  }

  const skipCurrent = () => {
    if (index === null) return
    setSkipped((s) => new Set([...s, index]))
    const next = index + 1
    if (next >= moves.length) onClose()
    else setIndex(next)
  }

  if (moves.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl">
          <h2 className="text-lg font-semibold text-gray-100 mb-2">Nothing to suggest</h2>
          <p className="text-sm text-gray-400 mb-4">All guests are already assigned, or there are no tables.</p>
          <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl max-h-[80vh] flex flex-col">
        <h2 className="text-lg font-semibold text-gray-100 mb-1">Suggested Seating</h2>
        <p className="text-sm text-gray-400 mb-4">{moves.length} proposed {moves.length === 1 ? 'move' : 'moves'}</p>

        {index === null ? (
          <>
            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 mb-4">
              {moves.map((m, i) => {
                const mates = tablemates(m.toTableId)
                return (
                  <div key={i} className="text-sm bg-gray-700 rounded px-3 py-2">
                    <span className="text-gray-100">Move <strong>{guestName(m.guestId)}</strong> → {tableName(m.toTableId)}</span>
                    {mates.length > 0 && (
                      <span className="text-gray-400 text-xs ml-1">(with {mates.slice(0, 3).join(', ')}{mates.length > 3 ? '…' : ''})</span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white">Cancel</button>
              <button onClick={startReview} className="px-4 py-2 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600">Review Each</button>
              <button onClick={applyAll} className="flex-1 py-2 text-sm bg-violet-600 text-white rounded hover:bg-violet-700">Apply All</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 flex flex-col justify-center mb-4">
              <div className="text-xs text-gray-500 mb-2">Move {index + 1} of {moves.length}</div>
              <div className="bg-gray-700 rounded-lg px-4 py-4">
                <p className="text-gray-100 mb-1">
                  Move <strong>{guestName(moves[index].guestId)}</strong>
                </p>
                <p className="text-gray-300">→ {tableName(moves[index].toTableId)}</p>
                {tablemates(moves[index].toTableId).length > 0 && (
                  <p className="text-gray-400 text-xs mt-1">
                    Seated with: {tablemates(moves[index].toTableId).join(', ')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={skipCurrent} className="flex-1 py-2 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600">Skip</button>
              <button onClick={acceptCurrent} className="flex-1 py-2 text-sm bg-violet-600 text-white rounded hover:bg-violet-700">Accept</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
