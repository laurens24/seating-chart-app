// src/store/useStore.ts
import { create } from 'zustand'
import { Guest, Table, AppState } from '../types'
import { newId } from '../utils/ids'
import { saveState, loadState, debounce, migrate } from './persistence'
import { middleDropInsertIndex } from '../engine/seating'

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
  removeTables: (ids: string[]) => void
  defaultTableCapacity: number
  setDefaultTableCapacity: (n: number) => void
  // assignment
  assignGuest: (guestId: string, tableId: string, insertIndex?: number) => void
  unassignGuest: (guestId: string) => void
  reorderSeat: (tableId: string, guestId: string, toIndex: number) => void
  // relationships
  addRelationship: (guestAId: string, guestBId: string, type: 'together' | 'apart' | 'plus-one', note: string) => void
  removeRelationship: (guestAId: string, guestBId: string) => void
  // bulk
  unassignGuests: (guestIds: string[]) => void
  removeGuests: (guestIds: string[]) => void
  applyMoves: (
    moves: Array<{ guestId: string; toTableId: string; insertIndex?: number }>,
    newTables?: Table[],
    tableRenames?: Array<{ tableId: string; newName: string }>,
  ) => void
  resetChart: () => void
  importState: (state: AppState) => void
  // history
  _history: AppState[]
  _future: AppState[]
  undo: () => void
  redo: () => void
  // dark mode
  darkMode: boolean
  toggleDarkMode: () => void
  // ephemeral UI
  hoveredTag: string | null
  setHoveredTag: (tag: string | null) => void
  hoveredGuestId: string | null
  setHoveredGuestId: (id: string | null) => void
  multiSelectIds: Set<string>
  setMultiSelectIds: (ids: Set<string>) => void
  selectedTableIds: Set<string>
  setSelectedTableIds: (ids: Set<string>) => void
  tableGroupDragDelta: { x: number; y: number } | null
  setTableGroupDragDelta: (delta: { x: number; y: number } | null) => void
  orbitInsertHint: { tableId: string; index: number } | null
  setOrbitInsertHint: (hint: { tableId: string; index: number } | null) => void
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
    _future: [],
  }
}

export const useStore = create<Store>((set) => ({
  ...initial,
  _history: [],
  _future: [],
  darkMode: localStorage.getItem('seatinghelper_dark') === '1',
  toggleDarkMode: () => set((s) => {
    const next = !s.darkMode
    localStorage.setItem('seatinghelper_dark', next ? '1' : '0')
    document.documentElement.classList.toggle('dark', next)
    return { darkMode: next }
  }),
  hoveredTag: null,
  setHoveredTag: (tag) => set({ hoveredTag: tag }),
  hoveredGuestId: null,
  setHoveredGuestId: (id) => set({ hoveredGuestId: id }),
  multiSelectIds: new Set<string>(),
  setMultiSelectIds: (ids) => set({ multiSelectIds: ids }),
  selectedTableIds: new Set<string>(),
  setSelectedTableIds: (ids) => set({ selectedTableIds: ids }),
  tableGroupDragDelta: null,
  setTableGroupDragDelta: (delta) => set({ tableGroupDragDelta: delta }),
  orbitInsertHint: null,
  setOrbitInsertHint: (hint) => set({ orbitInsertHint: hint }),
  defaultTableCapacity: 8,
  setDefaultTableCapacity: (n) => set({ defaultTableCapacity: n }),

  undo: () => set((s) => {
    if (s._history.length === 0) return s
    const prev = s._history[s._history.length - 1]
    debouncedSave(prev)
    return { ...prev, _history: s._history.slice(0, -1), _future: [snapshot(s), ...s._future].slice(0, HISTORY_LIMIT) }
  }),

  redo: () => set((s) => {
    if (s._future.length === 0) return s
    const next = s._future[0]
    debouncedSave(next)
    return { ...next, _history: [...s._history, snapshot(s)].slice(-HISTORY_LIMIT), _future: s._future.slice(1) }
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
      tables: s.tables.map((t) => t.seatOrder.includes(id) ? { ...t, seatOrder: t.seatOrder.filter((sid) => sid !== id) } : t),
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
        capacity: s.defaultTableCapacity,
        position,
        shape: 'round' as const,
        seatOrder: [],
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

  removeTables: (ids) => set((s) => {
    const idSet = new Set(ids)
    const next = {
      ...s,
      tables: s.tables.filter((t) => !idSet.has(t.id)),
      guests: s.guests.map((g) => g.tableId && idSet.has(g.tableId) ? { ...g, tableId: null } : g),
    }
    debouncedSave(next)
    return withHistory(s, next)
  }),

  assignGuest: (guestId, tableId, insertIndex) => set((s) => {
    const guest = s.guests.find((g) => g.id === guestId)
    if (!guest) return s
    const fromTableId = guest.tableId
    const tables = s.tables.map((t) => {
      if (t.id === fromTableId && t.id !== tableId) {
        return { ...t, seatOrder: t.seatOrder.filter((id) => id !== guestId) }
      }
      if (t.id === tableId) {
        const without = t.seatOrder.filter((id) => id !== guestId)
        const idx = insertIndex !== undefined
          ? Math.max(0, Math.min(insertIndex, without.length))
          : middleDropInsertIndex(guestId, without, s.relationships)
        const seatOrder = [...without.slice(0, idx), guestId, ...without.slice(idx)]
        return { ...t, seatOrder }
      }
      return t
    })
    const guests = s.guests.map((g) => g.id === guestId ? { ...g, tableId } : g)
    const next = { ...s, guests, tables }
    debouncedSave(next)
    return withHistory(s, next)
  }),

  unassignGuest: (guestId) => set((s) => {
    const guests = s.guests.map((g) => g.id === guestId ? { ...g, tableId: null } : g)
    const tables = s.tables.map((t) => t.seatOrder.includes(guestId) ? { ...t, seatOrder: t.seatOrder.filter((id) => id !== guestId) } : t)
    const next = { ...s, guests, tables }
    debouncedSave(next)
    return withHistory(s, next)
  }),

  unassignGuests: (guestIds) => set((s) => {
    const ids = new Set(guestIds)
    const guests = s.guests.map((g) => ids.has(g.id) ? { ...g, tableId: null } : g)
    const tables = s.tables.map((t) => t.seatOrder.some((sid) => ids.has(sid)) ? { ...t, seatOrder: t.seatOrder.filter((sid) => !ids.has(sid)) } : t)
    const next = { ...s, guests, tables }
    debouncedSave(next)
    return withHistory(s, next)
  }),

  reorderSeat: (tableId, guestId, toIndex) => set((s) => {
    const tables = s.tables.map((t) => {
      if (t.id !== tableId) return t
      const without = t.seatOrder.filter((id) => id !== guestId)
      const idx = Math.max(0, Math.min(toIndex, without.length))
      return { ...t, seatOrder: [...without.slice(0, idx), guestId, ...without.slice(idx)] }
    })
    const next = { ...s, tables }
    debouncedSave(next)
    return withHistory(s, next)
  }),

  removeGuests: (guestIds) => set((s) => {
    const ids = new Set(guestIds)
    const next = {
      ...s,
      guests: s.guests.filter((g) => !ids.has(g.id)),
      relationships: s.relationships.filter((r) => !ids.has(r.guestAId) && !ids.has(r.guestBId)),
      tables: s.tables.map((t) => t.seatOrder.some((sid) => ids.has(sid)) ? { ...t, seatOrder: t.seatOrder.filter((sid) => !ids.has(sid)) } : t),
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

  applyMoves: (moves, newTables = [], tableRenames = []) => set((s) => {
    const guestById = new Map(s.guests.map((g) => [g.id, g]))
    // Build working seatOrder per existing + new table.
    const workingSeats = new Map<string, string[]>()
    for (const t of s.tables) workingSeats.set(t.id, [...t.seatOrder])
    for (const t of newTables) workingSeats.set(t.id, Array.isArray(t.seatOrder) ? [...t.seatOrder] : [])
    // Track each guest's currently-resolved tableId as we replay moves.
    const currentTableForGuest = new Map<string, string | null>()
    for (const g of s.guests) currentTableForGuest.set(g.id, g.tableId)

    for (const m of moves) {
      const guest = guestById.get(m.guestId)
      if (!guest) continue
      const fromTableId = currentTableForGuest.get(m.guestId) ?? null
      if (fromTableId && fromTableId !== m.toTableId) {
        const fromSeats = workingSeats.get(fromTableId)
        if (fromSeats) workingSeats.set(fromTableId, fromSeats.filter((id) => id !== m.guestId))
      }
      const toSeats = workingSeats.get(m.toTableId) ?? []
      const without = toSeats.filter((id) => id !== m.guestId)
      const idx = m.insertIndex !== undefined
        ? Math.max(0, Math.min(m.insertIndex, without.length))
        : middleDropInsertIndex(m.guestId, without, s.relationships)
      workingSeats.set(m.toTableId, [...without.slice(0, idx), m.guestId, ...without.slice(idx)])
      currentTableForGuest.set(m.guestId, m.toTableId)
    }

    const guests = s.guests.map((g) => {
      const next = currentTableForGuest.get(g.id)
      return next === g.tableId ? g : { ...g, tableId: next ?? null }
    })

    const renameById = new Map(tableRenames.map((r) => [r.tableId, r.newName]))
    const updatedExisting = s.tables.map((t) => {
      const seatOrder = workingSeats.get(t.id) ?? t.seatOrder
      const name = renameById.has(t.id) ? renameById.get(t.id)! : t.name
      return { ...t, name, seatOrder }
    })
    const updatedNew = newTables.map((t) => ({
      ...t,
      seatOrder: workingSeats.get(t.id) ?? (Array.isArray(t.seatOrder) ? t.seatOrder : []),
    }))
    const tables = [...updatedExisting, ...updatedNew]
    const next = { ...s, guests, tables }
    debouncedSave(next)
    return withHistory(s, next)
  }),

  resetChart: () => set((s) => {
    const next: AppState = { guests: [], relationships: [], tables: [] }
    debouncedSave(next)
    return { ...next, _history: [...s._history, snapshot(s)].slice(-HISTORY_LIMIT) }
  }),

  importState: (state) => set((s) => {
    const migrated = migrate(state)
    debouncedSave(migrated)
    return { ...migrated, _history: [...s._history, snapshot(s)].slice(-HISTORY_LIMIT) }
  }),
}))
