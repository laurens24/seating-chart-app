// src/store/useStore.ts
import { create } from 'zustand'
import { Guest, Table, AppState } from '../types'
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
  addRelationship: (guestAId: string, guestBId: string, type: 'together' | 'apart' | 'plus-one', note: string) => void
  removeRelationship: (guestAId: string, guestBId: string) => void
  // bulk
  unassignGuests: (guestIds: string[]) => void
  removeGuests: (guestIds: string[]) => void
  applyMoves: (moves: Array<{ guestId: string; toTableId: string }>, newTables?: Table[]) => void
  resetChart: () => void
  importState: (state: AppState) => void
  // history
  _history: AppState[]
  undo: () => void
  // ephemeral UI
  hoveredTag: string | null
  setHoveredTag: (tag: string | null) => void
  hoveredGuestId: string | null
  setHoveredGuestId: (id: string | null) => void
  multiSelectIds: Set<string>
  setMultiSelectIds: (ids: Set<string>) => void
}

const saved = loadState()
const initial: AppState = saved ?? { guests: [], relationships: [], tables: [] }

const HISTORY_LIMIT = 50

function snapshot(s: Store): AppState {
  return { guests: s.guests, relationships: s.relationships, tables: s.tables }
}

function withHistory(s: Store, next: AppState): Partial<Store> {
  return {
    ...next,
    _history: [...s._history, snapshot(s)].slice(-HISTORY_LIMIT),
  }
}

export const useStore = create<Store>((set) => ({
  ...initial,
  _history: [],
  hoveredTag: null,
  setHoveredTag: (tag) => set({ hoveredTag: tag }),
  hoveredGuestId: null,
  setHoveredGuestId: (id) => set({ hoveredGuestId: id }),
  multiSelectIds: new Set<string>(),
  setMultiSelectIds: (ids) => set({ multiSelectIds: ids }),

  undo: () => set((s) => {
    if (s._history.length === 0) return s
    const prev = s._history[s._history.length - 1]
    const next = { ...prev, _history: s._history.slice(0, -1) }
    debouncedSave(prev)
    return next
  }),

  addGuest: (name) => set((s) => {
    const next = { ...s, guests: [...s.guests, { id: newId(), name, tags: [], notes: '', tableId: null }] }
    debouncedSave(next)
    return withHistory(s, next)
  }),

  updateGuest: (id, patch) => set((s) => {
    const next = { ...s, guests: s.guests.map((g) => g.id === id ? { ...g, ...patch } : g) }
    debouncedSave(next)
    return withHistory(s, next)
  }),

  removeGuest: (id) => set((s) => {
    const next = {
      ...s,
      guests: s.guests.filter((g) => g.id !== id),
      relationships: s.relationships.filter((r) => r.guestAId !== id && r.guestBId !== id),
    }
    debouncedSave(next)
    return withHistory(s, next)
  }),

  addTable: () => set((s) => {
    const n = s.tables.length + 1
    const STEP = 168 // matches TableShape footprint (LABEL_ORBIT + 20) * 2
    const COLS = 5
    // Grid is centered on the canvas (3000×2000) so new tables appear in the initial view
    const ORIGIN_X = 1500 - Math.floor(COLS / 2) * STEP // ~1164
    const ORIGIN_Y = 1000 - STEP // ~832
    const overlaps = (cx: number, cy: number) =>
      s.tables.some((t) => Math.abs(t.position.x - cx) < STEP && Math.abs(t.position.y - cy) < STEP)
    let position = { x: ORIGIN_X, y: ORIGIN_Y }
    outer: for (let row = 0; row < 20; row++) {
      for (let col = 0; col < COLS; col++) {
        const candidate = { x: ORIGIN_X + col * STEP, y: ORIGIN_Y + row * STEP }
        if (!overlaps(candidate.x, candidate.y)) {
          position = candidate
          break outer
        }
      }
    }
    const next = {
      ...s,
      tables: [...s.tables, {
        id: newId(),
        name: `Table ${n}`,
        capacity: 8,
        position,
        shape: 'round' as const,
      }],
    }
    debouncedSave(next)
    return withHistory(s, next)
  }),

  updateTable: (id, patch) => set((s) => {
    const next = { ...s, tables: s.tables.map((t) => t.id === id ? { ...t, ...patch } : t) }
    debouncedSave(next)
    // position-only drags would flood history; only track meaningful changes
    const isPositionOnly = Object.keys(patch).length === 1 && 'position' in patch
    return isPositionOnly ? next : withHistory(s, next)
  }),

  removeTable: (id) => set((s) => {
    const next = {
      ...s,
      tables: s.tables.filter((t) => t.id !== id),
      guests: s.guests.map((g) => g.tableId === id ? { ...g, tableId: null } : g),
    }
    debouncedSave(next)
    return withHistory(s, next)
  }),

  assignGuest: (guestId, tableId) => set((s) => {
    const next = { ...s, guests: s.guests.map((g) => g.id === guestId ? { ...g, tableId } : g) }
    debouncedSave(next)
    return withHistory(s, next)
  }),

  unassignGuest: (guestId) => set((s) => {
    const next = { ...s, guests: s.guests.map((g) => g.id === guestId ? { ...g, tableId: null } : g) }
    debouncedSave(next)
    return withHistory(s, next)
  }),

  unassignGuests: (guestIds) => set((s) => {
    const ids = new Set(guestIds)
    const next = { ...s, guests: s.guests.map((g) => ids.has(g.id) ? { ...g, tableId: null } : g) }
    debouncedSave(next)
    return withHistory(s, next)
  }),

  removeGuests: (guestIds) => set((s) => {
    const ids = new Set(guestIds)
    const next = {
      ...s,
      guests: s.guests.filter((g) => !ids.has(g.id)),
      relationships: s.relationships.filter((r) => !ids.has(r.guestAId) && !ids.has(r.guestBId)),
    }
    debouncedSave(next)
    return withHistory(s, next)
  }),

  addRelationship: (guestAId, guestBId, type, note) => set((s) => {
    const exists = s.relationships.some(
      (r) => (r.guestAId === guestAId && r.guestBId === guestBId) ||
              (r.guestAId === guestBId && r.guestBId === guestAId)
    )
    if (exists) return s
    const next = { ...s, relationships: [...s.relationships, { guestAId, guestBId, type, note }] }
    debouncedSave(next)
    return withHistory(s, next)
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
    return withHistory(s, next)
  }),

  applyMoves: (moves, newTables = []) => set((s) => {
    let guests = s.guests
    for (const { guestId, toTableId } of moves) {
      guests = guests.map((g) => g.id === guestId ? { ...g, tableId: toTableId } : g)
    }
    const next = { ...s, guests, tables: [...s.tables, ...newTables] }
    debouncedSave(next)
    return withHistory(s, next)
  }),

  resetChart: () => set((s) => {
    const next: AppState = { guests: [], relationships: [], tables: [] }
    debouncedSave(next)
    return { ...next, _history: [...s._history, snapshot(s)].slice(-HISTORY_LIMIT) }
  }),

  importState: (state) => set((s) => {
    debouncedSave(state)
    return { ...state, _history: [...s._history, snapshot(s)].slice(-HISTORY_LIMIT) }
  }),
}))
