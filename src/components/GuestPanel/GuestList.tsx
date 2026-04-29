// src/components/GuestPanel/GuestList.tsx
import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { GuestSearch } from './GuestSearch'
import { GuestRow } from './GuestRow'
import { GuestEditor } from './GuestEditor'

export function GuestList() {
  const { guests, addGuest } = useStore()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = guests.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  )

  const selectedGuest = selectedId ? guests.find((g) => g.id === selectedId) : null

  const handleSelect = (id: string) => setSelectedId((prev) => (prev === id ? null : id))

  const handleAddGuest = () => {
    addGuest('New Guest')
    // select the newly added guest
    setTimeout(() => {
      const store = useStore.getState()
      const newest = store.guests[store.guests.length - 1]
      if (newest) setSelectedId(newest.id)
    }, 0)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2 shrink-0">
        <GuestSearch value={search} onChange={setSearch} />
        <div className="mt-2 text-xs text-gray-500">
          {guests.length} guests · {guests.filter((g) => g.tableId === null).length} unassigned
        </div>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 px-1">
        {filtered.map((guest) => (
          <div key={guest.id}>
            <GuestRow
              guest={guest}
              isSelected={selectedId === guest.id}
              onSelect={handleSelect}
            />
            {selectedId === guest.id && selectedGuest && (
              <GuestEditor guest={selectedGuest} onClose={() => setSelectedId(null)} />
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-gray-500 text-center mt-8">
            {search ? 'No guests match your search.' : 'No guests yet.'}
          </p>
        )}
      </div>
      <div className="px-3 py-3 shrink-0 border-t border-gray-700">
        <button
          onClick={handleAddGuest}
          className="w-full py-2 text-sm bg-violet-700 text-white rounded hover:bg-violet-600"
        >
          + Add Guest
        </button>
      </div>
    </div>
  )
}
