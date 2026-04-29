// src/store/useStore.ts
import { create } from 'zustand'
import { Guest, Relationship, Table, AppState } from '../types'
import { newId } from '../utils/ids'
import { saveState, loadState, debounce } from './persistence'

const debouncedSave = debounce((state: AppState) => saveState(state), 500)

interface Store extends AppState {
  // guests
  addGuest: (name: string) => void
  updateGuest: (id: string, patch: Partial<Omit<Guest, 'id'>>) => void
  removeGuest: (id: string) => void
  // tables
  addTable: () => void
  updateTable: (id: string, patch: Partial<Omit<Table, 'id'>>) => void
  removeTable: (id: string) => void
  // assignment
  assignGuest: (guestId: string, tableId: string) => void
  unassignGuest: (guestId: string) => void
  // relationships
  addRelationship: (guestAId: string, guestBId: string, type: 'together' | 'apart', note: string) => void
  removeRelationship: (guestAId: string, guestBId: string) => void
  // bulk
  applyMoves: (moves: Array<{ guestId: string; toTableId: string }>) => void
  resetChart: () => void
  importState: (state: AppState) => void
}

const saved = loadState()
const initial: AppState = saved ?? { guests: [], relationships: [], tables: [] }

export const useStore = create<Store>((set, get) => ({
  ...initial,

  addGuest: (name) => set((s) => {
    const next = { ...s, guests: [...s.guests, { id: newId(), name, tags: [], notes: '', tableId: null }] }
    debouncedSave(next)
    return next
  }),

  updateGuest: (id, patch) => set((s) => {
    const next = { ...s, guests: s.guests.map((g) => g.id === id ? { ...g, ...patch } : g) }
    debouncedSave(next)
    return next
  }),

  removeGuest: (id) => set((s) => {
    const next = {
      ...s,
      guests: s.guests.filter((g) => g.id !== id),
      relationships: s.relationships.filter((r) => r.guestAId !== id && r.guestBId !== id),
    }
    debouncedSave(next)
    return next
  }),

  addTable: () => set((s) => {
    const n = s.tables.length + 1
    const next = {
      ...s,
      tables: [...s.tables, {
        id: newId(),
        name: `Table ${n}`,
        capacity: 8,
        position: { x: 80 + ((n - 1) % 4) * 120, y: 80 + Math.floor((n - 1) / 4) * 120 },
        shape: 'round' as const,
      }],
    }
    debouncedSave(next)
    return next
  }),

  updateTable: (id, patch) => set((s) => {
    const next = { ...s, tables: s.tables.map((t) => t.id === id ? { ...t, ...patch } : t) }
    debouncedSave(next)
    return next
  }),

  removeTable: (id) => set((s) => {
    const next = {
      ...s,
      tables: s.tables.filter((t) => t.id !== id),
      guests: s.guests.map((g) => g.tableId === id ? { ...g, tableId: null } : g),
    }
    debouncedSave(next)
    return next
  }),

  assignGuest: (guestId, tableId) => set((s) => {
    const next = { ...s, guests: s.guests.map((g) => g.id === guestId ? { ...g, tableId } : g) }
    debouncedSave(next)
    return next
  }),

  unassignGuest: (guestId) => set((s) => {
    const next = { ...s, guests: s.guests.map((g) => g.id === guestId ? { ...g, tableId: null } : g) }
    debouncedSave(next)
    return next
  }),

  addRelationship: (guestAId, guestBId, type, note) => set((s) => {
    const exists = s.relationships.some(
      (r) => (r.guestAId === guestAId && r.guestBId === guestBId) ||
              (r.guestAId === guestBId && r.guestBId === guestAId)
    )
    if (exists) return s
    const next = { ...s, relationships: [...s.relationships, { guestAId, guestBId, type, note }] }
    debouncedSave(next)
    return next
  }),

  removeRelationship: (guestAId, guestBId) => set((s) => {
    const next = {
      ...s,
      relationships: s.relationships.filter(
        (r) => !((r.guestAId === guestAId && r.guestBId === guestBId) ||
                 (r.guestAId === guestBId && r.guestBId === guestAId))
      ),
    }
    debouncedSave(next)
    return next
  }),

  applyMoves: (moves) => set((s) => {
    let guests = s.guests
    for (const { guestId, toTableId } of moves) {
      guests = guests.map((g) => g.id === guestId ? { ...g, tableId: toTableId } : g)
    }
    const next = { ...s, guests }
    debouncedSave(next)
    return next
  }),

  resetChart: () => set(() => {
    const next: AppState = { guests: [], relationships: [], tables: [] }
    debouncedSave(next)
    return next
  }),

  importState: (state) => set(() => {
    debouncedSave(state)
    return state
  }),
}))
