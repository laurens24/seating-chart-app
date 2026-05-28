import { useState } from 'react'
import { Guest, Relationship } from '../types'

export interface DuplicateGroup {
  name: string
  guests: Guest[]
}

interface Props {
  groups: DuplicateGroup[]
  relationships: Relationship[]
  importGuests: Guest[]
  onResolve: (renamedGuests: Guest[], deletedIds: Set<string>) => void
  onCancel: () => void
}

export function DuplicateModal({ groups, relationships, importGuests, onResolve, onCancel }: Props) {
  const guestById = new Map(importGuests.map((g) => [g.id, g]))
  const plusOnePartner = new Map<string, Guest>()
  for (const r of relationships) {
    if (r.type !== 'plus-one') continue
    const a = guestById.get(r.guestAId)
    const b = guestById.get(r.guestBId)
    if (a && b) {
      plusOnePartner.set(a.id, b)
      plusOnePartner.set(b.id, a)
    }
  }
  const [editedNames, setEditedNames] = useState<Record<string, string>>({})
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const setName = (id: string, value: string) =>
    setEditedNames((prev) => ({ ...prev, [id]: value }))

  const toggleDelete = (id: string) =>
    setDeletedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleResolve = () => {
    const renamedGuests: Guest[] = []
    for (const group of groups) {
      for (const g of group.guests) {
        const newName = editedNames[g.id]?.trim()
        if (newName && newName !== g.name) {
          renamedGuests.push({ ...g, name: newName })
        }
      }
    }
    onResolve(renamedGuests, deletedIds)
  }

  const hasUnresolvedDups = groups.some((group) => {
    const active = group.guests.filter((g) => !deletedIds.has(g.id))
    const names = active.map((g) => (editedNames[g.id]?.trim() || g.name).toLowerCase())
    return names.length > 1 && new Set(names).size < names.length
  })

  return (
    <div className="modal-backdrop">
      <div className="modal-panel max-w-md w-full max-h-[80vh] flex flex-col">
        <h2 className="text-lg font-semibold text-stone-900 mb-1">Duplicate Names</h2>
        <p className="text-sm text-stone-500 mb-4">
          These names already exist. Rename guests to tell them apart, or delete the extras.
        </p>

        <div className="flex-1 overflow-y-auto flex flex-col gap-5 mb-4">
          {groups.map((group) => (
            <div key={group.name}>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                "{group.name}"
              </p>
              <div className="flex flex-col gap-2">
                {group.guests.map((g, i) => {
                  const isDeleted = deletedIds.has(g.id)
                  const partner = plusOnePartner.get(g.id)
                  return (
                    <div
                      key={g.id}
                      className={`flex flex-col gap-1 p-2 rounded border ${isDeleted ? 'border-stone-200 bg-stone-50 opacity-40' : 'border-stone-200 bg-white'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-400 w-4 shrink-0">{i + 1}.</span>
                        <input
                          className="input flex-1 text-sm py-1"
                          value={editedNames[g.id] ?? g.name}
                          onChange={(e) => setName(g.id, e.target.value)}
                          disabled={isDeleted}
                          placeholder="Name"
                        />
                        <button
                          onClick={() => toggleDelete(g.id)}
                          title={isDeleted ? 'Keep this guest' : 'Delete this guest'}
                          className={`shrink-0 text-xs px-2 py-1 rounded ${isDeleted ? 'bg-stone-200 text-stone-500 hover:bg-green-100 hover:text-green-700' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                        >
                          {isDeleted ? 'Undo' : 'Delete'}
                        </button>
                      </div>
                      {partner && (
                        <div className="flex items-center gap-1.5 ml-6 text-xs text-pink-600">
                          <span className="font-semibold">+1</span>
                          <span className="text-stone-500">
                            plus-one of <span className="text-stone-800 font-medium">{editedNames[partner.id]?.trim() || partner.name}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {hasUnresolvedDups && (
          <p className="text-xs text-amber-600 mb-3">
            Some groups still have identical names. Rename or delete until each name is unique.
          </p>
        )}

        <div className="flex justify-end gap-3 shrink-0">
          <button onClick={onCancel} className="btn-ghost">Cancel</button>
          <button
            onClick={handleResolve}
            disabled={hasUnresolvedDups}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  )
}
