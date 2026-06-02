// src/components/GuestPanel/GuestList.tsx
import { useState, useEffect, useRef } from 'react'
import { AppState, Guest, Relationship, OnToast } from '../../types'
import { useStore } from '../../store/useStore'
import { GuestSearch } from './GuestSearch'
import { GuestRow } from './GuestRow'
import { GuestEditor } from './GuestEditor'
import { TagInput } from './TagInput'
import { ImportDialog } from '../ImportDialog'

function sortWithPlusOnes(guests: Guest[], allRelationships: ReturnType<typeof useStore.getState>['relationships']): Guest[] {
  const plusOnePairs = new Map<string, string>() // plusOneId -> primaryId
  for (const r of allRelationships) {
    if (r.type !== 'plus-one') continue
    const aIdx = guests.findIndex((g) => g.id === r.guestAId)
    const bIdx = guests.findIndex((g) => g.id === r.guestBId)
    if (aIdx === -1 || bIdx === -1) continue
    const [primaryId, plusOneId] = aIdx <= bIdx ? [r.guestAId, r.guestBId] : [r.guestBId, r.guestAId]
    plusOnePairs.set(plusOneId, primaryId)
  }

  const result: Guest[] = []
  const added = new Set<string>()

  for (const g of guests) {
    if (added.has(g.id)) continue
    if (plusOnePairs.has(g.id)) continue
    result.push(g)
    added.add(g.id)
    const plusOneId = [...plusOnePairs.entries()].find(([, primaryId]) => primaryId === g.id)?.[0]
    if (plusOneId) {
      const plusOneGuest = guests.find((pg) => pg.id === plusOneId)
      if (plusOneGuest && !added.has(plusOneId)) {
        result.push(plusOneGuest)
        added.add(plusOneId)
      }
    }
  }

  return result
}

type AssignFilter = 'all' | 'assigned' | 'unassigned'

interface Props {
  onToast: OnToast
}

export function GuestList({ onToast }: Props) {
  const { guests, relationships, addGuest, updateGuest, removeGuests, unassignGuests, setMultiSelectIds, importState } = useStore()
  const allTags = Array.from(new Set(guests.flatMap((g) => g.tags))).sort()
  const [search, setSearch] = useState('')
  const [assignFilter, setAssignFilter] = useState<AssignFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isMultiSelect, setIsMultiSelect] = useState(false)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [lastCheckedId, setLastCheckedId] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [showImport, setShowImport] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const handleImportGuests = (newGuests: Guest[], newRelationships: Relationship[], warnings: string[]) => {
    const { guests: current, relationships: currentRel, tables: currentTables } = useStore.getState()
    importState({ guests: [...current, ...newGuests], relationships: [...currentRel, ...newRelationships], tables: currentTables })
    setShowImport(false)
    if (warnings.length > 0) {
      onToast('warning', warnings.join(' '))
    } else {
      onToast('info', `Imported ${newGuests.length} guest${newGuests.length !== 1 ? 's' : ''}.`)
    }
  }

  const handleImportState = (state: AppState) => {
    importState(state)
    setShowImport(false)
    onToast('info', `Chart restored: ${state.guests.length} guests, ${state.tables.length} tables.`)
  }

  useEffect(() => { setMultiSelectIds(checkedIds) }, [checkedIds, setMultiSelectIds])

  const plusOneGuestIds = new Set<string>()
  for (const r of relationships) {
    if (r.type === 'plus-one') {
      plusOneGuestIds.add(r.guestAId)
      plusOneGuestIds.add(r.guestBId)
    }
  }

  const filtered = sortWithPlusOnes(
    guests.filter((g) => {
      const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      const matchesFilter = assignFilter === 'all' ||
        (assignFilter === 'assigned' && g.tableId !== null) ||
        (assignFilter === 'unassigned' && g.tableId === null)
      return matchesSearch && matchesFilter
    }),
    relationships
  )

  const selectedGuest = selectedId ? guests.find((g) => g.id === selectedId) : null

  const handleSelect = (id: string, shiftKey = false) => {
    if (isMultiSelect) {
      if (shiftKey && lastCheckedId && lastCheckedId !== id) {
        const ids = filtered.map((g) => g.id)
        const a = ids.indexOf(lastCheckedId)
        const b = ids.indexOf(id)
        const [lo, hi] = a < b ? [a, b] : [b, a]
        setCheckedIds((prev) => {
          const next = new Set(prev)
          for (let i = lo; i <= hi; i++) next.add(ids[i])
          return next
        })
      } else {
        setCheckedIds((prev) => {
          const next = new Set(prev)
          next.has(id) ? next.delete(id) : next.add(id)
          return next
        })
      }
      setLastCheckedId(id)
    } else {
      setSelectedId((prev) => (prev === id ? null : id))
    }
  }

  const handleAddGuest = () => {
    addGuest('New Guest')
    setTimeout(() => {
      const store = useStore.getState()
      const newest = store.guests[store.guests.length - 1]
      if (newest) setSelectedId(newest.id)
      // First frame: row renders. Second frame: GuestEditor expands below it.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
        })
      })
    }, 0)
  }

  const toggleMultiSelect = () => {
    setIsMultiSelect((v) => !v)
    setCheckedIds(new Set())
    setLastCheckedId(null)
    setTagInput('')
    setSelectedId(null)
  }

  const selectAll = () => setCheckedIds(new Set(guests.map((g) => g.id)))
  const selectNone = () => setCheckedIds(new Set())

  const unassignSelected = () => {
    unassignGuests([...checkedIds])
    setCheckedIds(new Set())
  }

  const deleteSelected = () => {
    removeGuests([...checkedIds])
    setCheckedIds(new Set())
  }

  const applyTags = () => {
    const newTags = tagInput.split(',').map((t) => t.trim()).filter(Boolean)
    if (!newTags.length || !checkedIds.size) return
    const { guests: currentGuests } = useStore.getState()
    for (const id of checkedIds) {
      const g = currentGuests.find((guest) => guest.id === id)
      if (!g) continue
      const merged = Array.from(new Set([...g.tags, ...newTags]))
      updateGuest(id, { tags: merged })
    }
    setTagInput('')
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-3 pt-3 pb-2 shrink-0">
        <GuestSearch value={search} onChange={setSearch} />
        <div className="mt-2 flex items-center gap-3">
          {(['all', 'assigned', 'unassigned'] as AssignFilter[]).map((f) => (
            <label key={f} className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="assignFilter"
                value={f}
                checked={assignFilter === f}
                onChange={() => setAssignFilter(f)}
                className="accent-violet-500"
              />
              <span className="text-xs text-stone-500 dark:text-stone-400 capitalize">{f}</span>
            </label>
          ))}
          <button
            onClick={toggleMultiSelect}
            className={`text-xs px-2 py-0.5 rounded ml-auto ${isMultiSelect ? 'bg-violet-700 text-white' : 'text-stone-500 hover:text-stone-800'}`}
          >
            {isMultiSelect ? 'Done' : 'Select'}
          </button>
        </div>
        <div className="mt-1 text-xs text-stone-400 dark:text-stone-500">
          {guests.length} guests · {guests.filter((g) => g.tableId === null).length} unassigned
        </div>
      </div>

      {isMultiSelect && (
        <div className="px-3 pb-2 shrink-0 flex flex-col gap-2 border-b border-stone-200 dark:border-stone-700">
          <div className="flex gap-1">
            <TagInput
              value={tagInput}
              onChange={setTagInput}
              allTags={allTags}
              placeholder="Add tags (comma-separated)"
              className="flex-1 text-xs px-2 py-1.5 bg-white border border-stone-300 rounded text-stone-900 focus:outline-none focus:border-violet-500"
              onEnter={applyTags}
            />
            <button
              onClick={applyTags}
              disabled={!tagInput.trim() || checkedIds.size === 0}
              className="btn-primary text-xs px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
          <div className="flex gap-1">
            <button
              onClick={unassignSelected}
              disabled={!guests.some((g) => checkedIds.has(g.id) && g.tableId !== null)}
              className="btn-primary text-xs py-1.5 flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Unassign selected
            </button>
            <button
              onClick={deleteSelected}
              disabled={checkedIds.size === 0}
              className="btn-danger text-xs py-1.5 flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Delete selected
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="text-xs text-violet-600 hover:text-violet-300">All</button>
            <button onClick={selectNone} className="text-xs text-stone-400 hover:text-stone-600">None</button>
            <span className="text-xs text-stone-400 ml-auto">{checkedIds.size} selected</span>
          </div>
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto flex flex-col gap-0.5 px-1">
        {filtered.map((guest) => (
          <div key={guest.id}>
            <GuestRow
              guest={guest}
              isSelected={selectedId === guest.id}
              onSelect={handleSelect}
              isPlusOne={plusOneGuestIds.has(guest.id)}
              isMultiSelect={isMultiSelect}
              isChecked={checkedIds.has(guest.id)}
              searchTerm={search}
            />
            {!isMultiSelect && selectedId === guest.id && selectedGuest && (
              <GuestEditor guest={selectedGuest} onClose={() => setSelectedId(null)} />
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-stone-400 dark:text-stone-500 text-center mt-8">
            {search ? 'No guests match your search.' : 'No guests yet.'}
          </p>
        )}
      </div>
      <div className="px-3 py-3 shrink-0 border-t border-stone-200 dark:border-stone-700 flex gap-2">
        <button onClick={handleAddGuest} className="btn-primary flex-1 py-2">
          + Add Guest
        </button>
        <button onClick={() => setShowImport(true)} className="btn-secondary flex-1 py-2">
          + Add Multiple Guests
        </button>
      </div>
      {showImport && (
        <ImportDialog
          onImportGuests={handleImportGuests}
          onImportState={handleImportState}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
