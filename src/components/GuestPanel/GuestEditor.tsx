// src/components/GuestPanel/GuestEditor.tsx
import { useState } from 'react'
import { Guest } from '../../types'
import { useStore } from '../../store/useStore'

interface Props {
  guest: Guest
  onClose: () => void
}

export function GuestEditor({ guest, onClose }: Props) {
  const { guests, relationships, updateGuest, removeGuest, addRelationship, removeRelationship, unassignGuest } = useStore()
  const [name, setName] = useState(guest.name)
  const [tagInput, setTagInput] = useState(guest.tags.join(', '))
  const [notes, setNotes] = useState(guest.notes)
  const [relGuestId, setRelGuestId] = useState('')
  const [relType, setRelType] = useState<'together' | 'apart'>('together')
  const [relNote, setRelNote] = useState('')

  const myRelationships = relationships.filter(
    (r) => r.guestAId === guest.id || r.guestBId === guest.id
  )

  const otherGuests = guests.filter((g) => g.id !== guest.id)

  const save = () => {
    if (!name.trim()) return
    updateGuest(guest.id, {
      name: name.trim(),
      tags: tagInput.split(',').map((t) => t.trim()).filter(Boolean),
      notes: notes.trim(),
    })
    onClose()
  }

  const addRel = () => {
    if (!relGuestId) return
    addRelationship(guest.id, relGuestId, relType, relNote.trim())
    setRelGuestId('')
    setRelNote('')
  }

  return (
    <div className="px-3 py-3 bg-gray-800 border border-gray-700 rounded-lg mx-2 mb-2">
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide">Tags (comma-separated)</label>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="bride's friend, college"
            className="mt-1 w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-violet-500 resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wide">Relationships</label>
          <div className="mt-1 flex flex-col gap-1">
            {myRelationships.map((r) => {
              const otherId = r.guestAId === guest.id ? r.guestBId : r.guestAId
              const other = guests.find((g) => g.id === otherId)
              return (
                <div key={`${r.guestAId}-${r.guestBId}`} className="flex items-center gap-2 text-sm">
                  <span className={r.type === 'apart' ? 'text-red-400' : 'text-green-400'}>
                    {r.type === 'apart' ? '✗' : '✓'}
                  </span>
                  <span className="text-gray-300">{other?.name ?? 'Unknown'}</span>
                  {r.note && <span className="text-gray-500 text-xs">({r.note})</span>}
                  <button
                    onClick={() => removeRelationship(r.guestAId, r.guestBId)}
                    className="ml-auto text-gray-500 hover:text-red-400 text-xs"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
            <div className="flex gap-1 mt-1">
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value as 'together' | 'apart')}
                className="text-xs bg-gray-700 border border-gray-600 rounded px-1 text-gray-200"
              >
                <option value="together">together</option>
                <option value="apart">apart</option>
              </select>
              <select
                value={relGuestId}
                onChange={(e) => setRelGuestId(e.target.value)}
                className="flex-1 text-xs bg-gray-700 border border-gray-600 rounded px-1 text-gray-200"
              >
                <option value="">— pick guest —</option>
                {otherGuests.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <button
                onClick={addRel}
                className="text-xs bg-violet-700 text-white px-2 rounded hover:bg-violet-600"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={save} className="flex-1 py-1.5 text-sm bg-violet-600 text-white rounded hover:bg-violet-700">
            Save
          </button>
          {guest.tableId && (
            <button
              onClick={() => { unassignGuest(guest.id); onClose() }}
              className="py-1.5 px-3 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
            >
              Unassign
            </button>
          )}
          <button
            onClick={() => { removeGuest(guest.id); onClose() }}
            className="py-1.5 px-3 text-sm bg-red-900/50 text-red-400 rounded hover:bg-red-900"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
