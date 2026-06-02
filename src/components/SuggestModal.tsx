import { useState } from 'react'

import { useStore } from '../store/useStore'
import { suggestMoves } from '../engine/suggest'

interface Props {
  onClose: () => void
}

export function SuggestModal({ onClose }: Props) {
  const { guests, relationships, tables, applyMoves, defaultTableCapacity } = useStore()
  const [{ moves, newTables, tableRenames }] = useState(() =>
    suggestMoves(guests, relationships, tables, defaultTableCapacity),
  )
  const [index, setIndex] = useState<number | null>(null) // null = show all
  const [_skipped, setSkipped] = useState<Set<number>>(new Set())
  // Track which new tables and renames have already been committed so we don't repeat
  const [committedTableIds, setCommittedTableIds] = useState<Set<string>>(new Set())
  const [committedRenameIds, setCommittedRenameIds] = useState<Set<string>>(new Set())

  const renameByTableId = new Map(tableRenames.map((r) => [r.tableId, r.newName]))
  const allTables = [...tables, ...newTables]
  const guestName = (id: string) => guests.find((g) => g.id === id)?.name ?? id
  const tableName = (id: string) => renameByTableId.get(id) ?? allTables.find((t) => t.id === id)?.name ?? id
  const tablemates = (toTableId: string) =>
    guests.filter((g) => g.tableId === toTableId).map((g) => g.name)

  const applyAll = () => { applyMoves(moves, newTables, tableRenames); onClose() }
  const startReview = () => setIndex(0)

  const acceptCurrent = () => {
    if (index === null) return
    const move = moves[index]
    const tableForMove = newTables.find((t) => t.id === move.toTableId && !committedTableIds.has(t.id))
    const tablesToCommit = tableForMove ? [tableForMove] : []
    const renameForMove = !committedRenameIds.has(move.toTableId) && renameByTableId.has(move.toTableId)
      ? [{ tableId: move.toTableId, newName: renameByTableId.get(move.toTableId)! }]
      : []
    applyMoves([move], tablesToCommit, renameForMove)
    if (tableForMove) setCommittedTableIds((s) => new Set([...s, tableForMove.id]))
    if (renameForMove.length > 0) setCommittedRenameIds((s) => new Set([...s, move.toTableId]))
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
      <div className="modal-backdrop">
        <div className="modal-panel max-w-sm w-full animate-modal-in">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Nothing to suggest</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">All guests are already assigned.</p>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-panel max-w-md w-full max-h-[80vh] flex flex-col animate-modal-in">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">Suggested Seating</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
          {moves.length} proposed {moves.length === 1 ? 'move' : 'moves'}
          {newTables.length > 0 && ` · ${newTables.length} new ${newTables.length === 1 ? 'table' : 'tables'} needed`}
        </p>

        {index === null ? (
          <>
            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 mb-4">
              {moves.map((m, i) => {
                const mates = tablemates(m.toTableId)
                return (
                  <div key={i} className="text-sm bg-stone-100 rounded px-3 py-2">
                    <span className="text-stone-900">Move <strong>{guestName(m.guestId)}</strong> → {tableName(m.toTableId)}</span>
                    {mates.length > 0 && (
                      <span className="text-stone-500 text-xs ml-1">(with {mates.slice(0, 3).join(', ')}{mates.length > 3 ? '…' : ''})</span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-ghost">Cancel</button>
              <button onClick={startReview} className="btn-secondary">Review Each</button>
              <button onClick={applyAll} className="btn-primary flex-1">Apply All</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 flex flex-col justify-center mb-4">
              <div className="text-xs text-stone-400 mb-2">Move {index + 1} of {moves.length}</div>
              <div className="bg-stone-100 rounded-lg px-4 py-4">
                <p className="text-stone-900 mb-1">Move <strong>{guestName(moves[index].guestId)}</strong></p>
                <p className="text-stone-600">→ {tableName(moves[index].toTableId)}</p>
                {tablemates(moves[index].toTableId).length > 0 && (
                  <p className="text-stone-500 text-xs mt-1">
                    Seated with: {tablemates(moves[index].toTableId).join(', ')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={skipCurrent} className="btn-secondary flex-1">Skip</button>
              <button onClick={acceptCurrent} className="btn-primary flex-1">Accept</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
