// src/components/GuestPanel/GuestEditor.tsx
import { useState } from 'react'
import { Guest } from '../../types'
import { useStore } from '../../store/useStore'
import { TagInput } from './TagInput'

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
  const [relType, setRelType] = useState<'together' | 'apart' | 'plus-one'>('together')
  const [relNote, setRelNote] = useState('')

  const myRelationships = relationships.filter(
    (r) => r.guestAId === guest.id || r.guestBId === guest.id
  )

  const otherGuests = guests.filter((g) => g.id !== guest.id)
  const allTags = Array.from(new Set(guests.flatMap((g) => g.tags))).sort()

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
    <div className="px-3 py-3 bg-stone-100 border border-stone-200 rounded-lg mx-2 mb-2">
      <div className="flex flex-col gap-3">
        <div>
          <label className="field-label">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 input" />
        </div>
        <div>
          <label className="field-label">Tags (comma-separated)</label>
          <TagInput
            value={tagInput}
            onChange={setTagInput}
            allTags={allTags}
            placeholder="bride's friend, college"
            className="mt-1 input"
          />
        </div>
        <div>
          <label className="field-label">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 input resize-none"
          />
        </div>

        <div>
          <label className="field-label">Relationships</label>
          <div className="mt-1 flex flex-col gap-1">
            {myRelationships.map((r) => {
              const otherId = r.guestAId === guest.id ? r.guestBId : r.guestAId
              const other = guests.find((g) => g.id === otherId)
              return (
                <div key={`${r.guestAId}-${r.guestBId}`} className="flex items-center gap-2 text-sm">
                  <span className={r.type === 'apart' ? 'text-red-400' : r.type === 'plus-one' ? 'text-pink-400' : 'text-green-500'}>
                    {r.type === 'apart' ? '✗' : r.type === 'plus-one' ? '+1' : '✓'}
                  </span>
                  <span className="text-stone-600">{other?.name ?? 'Unknown'}</span>
                  {r.note && <span className="text-stone-400 text-xs">({r.note})</span>}
                  <button
                    onClick={() => removeRelationship(r.guestAId, r.guestBId)}
                    className="ml-auto text-stone-400 hover:text-red-400 text-xs"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
            <div className="flex gap-1 mt-1 min-w-0">
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value as 'together' | 'apart' | 'plus-one')}
                className="text-xs bg-white border border-stone-300 rounded px-1 text-stone-800 shrink-0"
              >
                <option value="together">together</option>
                <option value="apart">apart</option>
                <option value="plus-one">plus-one</option>
              </select>
              <select
                value={relGuestId}
                onChange={(e) => setRelGuestId(e.target.value)}
                className="flex-1 min-w-0 text-xs bg-white border border-stone-300 rounded px-1 text-stone-800"
              >
                <option value="">— pick guest —</option>
                {otherGuests.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <button onClick={addRel} className="btn-primary text-xs px-2 py-1 shrink-0">Add</button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={save} className="btn-primary flex-1">Save</button>
          {guest.tableId && (
            <button onClick={() => { unassignGuest(guest.id); onClose() }} className="btn-secondary">
              Unassign
            </button>
          )}
          <button onClick={() => { removeGuest(guest.id); onClose() }} className="btn-danger">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
