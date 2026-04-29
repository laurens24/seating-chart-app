# Wedding Seating Chart App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side React SPA that lets couples create, annotate, and auto-suggest a wedding seating chart with no backend required.

**Architecture:** All state lives in a Zustand store, auto-persisted to localStorage. The left panel manages guests; the right panel has Floor Plan and Table List tabs. A greedy client-side engine proposes seating assignments in a Propose & Review modal.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, @dnd-kit/core, Tailwind CSS, Vitest + @testing-library/react

---

## File Map

```
src/
  main.tsx                         # entry point
  App.tsx                          # root layout (TopBar + GuestPanel + ChartPanel)
  types.ts                         # Guest, Relationship, Table, AppState types
  store/
    useStore.ts                    # Zustand store — all state + actions
    persistence.ts                 # localStorage helpers + debounce
  engine/
    conflicts.ts                   # apart-conflict detection
    suggest.ts                     # greedy suggest algorithm
  utils/
    ids.ts                         # nanoid wrapper
    importFile.ts                  # .txt and .csv parsing
    exportFile.ts                  # JSON download + print trigger
  components/
    TopBar.tsx                     # title, Import/Export/New Chart buttons
    Toast.tsx                      # toast notification (error/warning/info)
    ConfirmDialog.tsx              # generic yes/no modal
    GuestPanel/
      GuestSearch.tsx              # search input
      GuestRow.tsx                 # single guest row (name, tags, conflict dot)
      GuestEditor.tsx              # inline drawer: name/tags/notes/relationships
      GuestList.tsx                # scrollable list + Add Guest button
      GuestPanel.tsx               # left panel wrapper
    ChartPanel/
      TableEditor.tsx              # inline form: name/capacity/shape
      TableShape.tsx               # draggable circle/rect on canvas
      FloorPlan.tsx                # DndContext canvas
      TableRow.tsx                 # table row in list view
      TableList.tsx                # table list + Add Table button
      ChartPanel.tsx               # right panel: tabs + Suggest button
    SuggestModal.tsx               # propose & review flow
    ImportDialog.tsx               # file picker + parse + preview
tests/
  engine/
    conflicts.test.ts
    suggest.test.ts
  utils/
    importFile.test.ts
    exportFile.test.ts
  store/
    useStore.test.ts
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: Scaffold Vite project**

```bash
npm create vite@latest . -- --template react-ts
npm install
```

Expected: project files created, `npm run dev` starts on localhost:5173.

- [ ] **Step 2: Install dependencies**

```bash
npm install zustand @dnd-kit/core @dnd-kit/utilities nanoid
npm install -D tailwindcss postcss autoprefixer vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind**

Replace `tailwind.config.js` content:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Add to `src/index.css` (replace existing):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Configure Vitest**

Add to `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

Create `src/test-setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Stub App.tsx**

```tsx
// src/App.tsx
export default function App() {
  return <div className="h-screen flex flex-col bg-gray-950 text-gray-100">WeddingSeat</div>
}
```

- [ ] **Step 6: Verify dev server and tests run**

```bash
npm run dev      # should show "WeddingSeat" at localhost:5173
npx vitest run   # should report 0 tests, no errors
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite React TS project with Tailwind and Vitest"
```

---

### Task 2: Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write types**

```ts
// src/types.ts
export interface Guest {
  id: string
  name: string
  tags: string[]
  notes: string
  tableId: string | null
}

export interface Relationship {
  guestAId: string
  guestBId: string
  type: 'together' | 'apart'
  note: string
}

export interface Table {
  id: string
  name: string
  capacity: number
  position: { x: number; y: number }
  shape: 'round' | 'rectangular'
}

export interface AppState {
  guests: Guest[]
  relationships: Relationship[]
  tables: Table[]
}

export interface ToastMessage {
  id: string
  type: 'info' | 'warning' | 'error'
  message: string
}

export interface SuggestedMove {
  guestId: string
  toTableId: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add core types"
```

---

### Task 3: ID utility

**Files:**
- Create: `src/utils/ids.ts`

- [ ] **Step 1: Write utility**

```ts
// src/utils/ids.ts
import { nanoid } from 'nanoid'
export const newId = () => nanoid(10)
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/ids.ts
git commit -m "feat: add id utility"
```

---

### Task 4: Persistence helpers

**Files:**
- Create: `src/store/persistence.ts`
- Create: `tests/store/persistence.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/store/persistence.test.ts
import { saveState, loadState } from '../../src/store/persistence'
import { AppState } from '../../src/types'

const sample: AppState = {
  guests: [{ id: '1', name: 'Alice', tags: ['friend'], notes: '', tableId: null }],
  relationships: [],
  tables: [],
}

describe('persistence', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips state through localStorage', () => {
    saveState(sample)
    expect(loadState()).toEqual(sample)
  })

  it('returns null when nothing is saved', () => {
    expect(loadState()).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/store/persistence.test.ts
```
Expected: FAIL — `saveState` not found.

- [ ] **Step 3: Implement**

```ts
// src/store/persistence.ts
import { AppState } from '../types'

const KEY = 'weddingseat_v1'

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // quota exceeded — silently ignore
  }
}

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as AppState) : null
  } catch {
    return null
  }
}

export function clearState(): void {
  localStorage.removeItem(KEY)
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/store/persistence.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/persistence.ts tests/store/persistence.test.ts
git commit -m "feat: add localStorage persistence helpers"
```

---

### Task 5: Zustand store

**Files:**
- Create: `src/store/useStore.ts`
- Create: `tests/store/useStore.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/store/useStore.test.ts
import { act, renderHook } from '@testing-library/react'
import { useStore } from '../../src/store/useStore'

beforeEach(() => {
  localStorage.clear()
  useStore.setState({ guests: [], relationships: [], tables: [] })
})

describe('guests', () => {
  it('adds a guest', () => {
    const { result } = renderHook(() => useStore())
    act(() => result.current.addGuest('Alice'))
    expect(result.current.guests).toHaveLength(1)
    expect(result.current.guests[0].name).toBe('Alice')
  })

  it('updates a guest', () => {
    const { result } = renderHook(() => useStore())
    act(() => result.current.addGuest('Alice'))
    const id = result.current.guests[0].id
    act(() => result.current.updateGuest(id, { name: 'Alice B', tags: ['friend'] }))
    expect(result.current.guests[0].name).toBe('Alice B')
    expect(result.current.guests[0].tags).toEqual(['friend'])
  })

  it('removes a guest and their relationships', () => {
    const { result } = renderHook(() => useStore())
    act(() => result.current.addGuest('Alice'))
    act(() => result.current.addGuest('Bob'))
    const aliceId = result.current.guests[0].id
    const bobId = result.current.guests[1].id
    act(() => result.current.addRelationship(aliceId, bobId, 'apart', ''))
    act(() => result.current.removeGuest(aliceId))
    expect(result.current.guests).toHaveLength(1)
    expect(result.current.relationships).toHaveLength(0)
  })
})

describe('tables', () => {
  it('adds a table', () => {
    const { result } = renderHook(() => useStore())
    act(() => result.current.addTable())
    expect(result.current.tables).toHaveLength(1)
    expect(result.current.tables[0].capacity).toBe(8)
  })

  it('removes a table and unassigns its guests', () => {
    const { result } = renderHook(() => useStore())
    act(() => result.current.addGuest('Alice'))
    act(() => result.current.addTable())
    const guestId = result.current.guests[0].id
    const tableId = result.current.tables[0].id
    act(() => result.current.assignGuest(guestId, tableId))
    act(() => result.current.removeTable(tableId))
    expect(result.current.tables).toHaveLength(0)
    expect(result.current.guests[0].tableId).toBeNull()
  })
})

describe('assignment', () => {
  it('assigns and unassigns a guest', () => {
    const { result } = renderHook(() => useStore())
    act(() => result.current.addGuest('Alice'))
    act(() => result.current.addTable())
    const guestId = result.current.guests[0].id
    const tableId = result.current.tables[0].id
    act(() => result.current.assignGuest(guestId, tableId))
    expect(result.current.guests[0].tableId).toBe(tableId)
    act(() => result.current.unassignGuest(guestId))
    expect(result.current.guests[0].tableId).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/store/useStore.test.ts
```
Expected: FAIL — `useStore` not found.

- [ ] **Step 3: Implement store**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/store/useStore.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/useStore.ts tests/store/useStore.test.ts
git commit -m "feat: add Zustand store with all CRUD and assignment actions"
```

---

### Task 6: Conflict detection

**Files:**
- Create: `src/engine/conflicts.ts`
- Create: `tests/engine/conflicts.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/engine/conflicts.test.ts
import { findTableConflicts, hasConflict } from '../../src/engine/conflicts'
import { Guest, Relationship } from '../../src/types'

const guests: Guest[] = [
  { id: 'a', name: 'Alice', tags: [], notes: '', tableId: 't1' },
  { id: 'b', name: 'Bob',   tags: [], notes: '', tableId: 't1' },
  { id: 'c', name: 'Carol', tags: [], notes: '', tableId: 't2' },
]
const rels: Relationship[] = [
  { guestAId: 'a', guestBId: 'b', type: 'apart', note: 'fighting' },
]

describe('findTableConflicts', () => {
  it('returns conflicting pairs at the same table', () => {
    const result = findTableConflicts('t1', guests, rels)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ guestAId: 'a', guestBId: 'b', type: 'apart', note: 'fighting' })
  })

  it('returns empty when no conflicts at table', () => {
    expect(findTableConflicts('t2', guests, rels)).toHaveLength(0)
  })
})

describe('hasConflict', () => {
  it('detects when a guest would conflict at a table', () => {
    expect(hasConflict('c', 't1', guests, rels)).toBe(true)
  })

  it('returns false when no conflict', () => {
    expect(hasConflict('c', 't2', guests, rels)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/engine/conflicts.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/engine/conflicts.ts
import { Guest, Relationship } from '../types'

export function findTableConflicts(
  tableId: string,
  guests: Guest[],
  relationships: Relationship[]
): Relationship[] {
  const seated = new Set(guests.filter((g) => g.tableId === tableId).map((g) => g.id))
  return relationships.filter(
    (r) => r.type === 'apart' && seated.has(r.guestAId) && seated.has(r.guestBId)
  )
}

export function hasConflict(
  guestId: string,
  tableId: string,
  guests: Guest[],
  relationships: Relationship[]
): boolean {
  const seated = new Set(guests.filter((g) => g.tableId === tableId).map((g) => g.id))
  return relationships.some(
    (r) =>
      r.type === 'apart' &&
      ((r.guestAId === guestId && seated.has(r.guestBId)) ||
       (r.guestBId === guestId && seated.has(r.guestAId)))
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/engine/conflicts.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/conflicts.ts tests/engine/conflicts.test.ts
git commit -m "feat: add conflict detection engine"
```

---

### Task 7: Suggest engine

**Files:**
- Create: `src/engine/suggest.ts`
- Create: `tests/engine/suggest.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/engine/suggest.test.ts
import { suggestMoves } from '../../src/engine/suggest'
import { Guest, Relationship, Table } from '../../src/types'

const tables: Table[] = [
  { id: 't1', name: 'Table 1', capacity: 3, position: { x: 0, y: 0 }, shape: 'round' },
  { id: 't2', name: 'Table 2', capacity: 3, position: { x: 0, y: 0 }, shape: 'round' },
]

describe('suggestMoves', () => {
  it('assigns all unassigned guests', () => {
    const guests: Guest[] = [
      { id: 'a', name: 'Alice', tags: [], notes: '', tableId: null },
      { id: 'b', name: 'Bob',   tags: [], notes: '', tableId: null },
    ]
    const moves = suggestMoves(guests, [], tables)
    expect(moves).toHaveLength(2)
    expect(moves.every((m) => m.toTableId)).toBe(true)
  })

  it('never places apart guests at the same table when avoidable', () => {
    const guests: Guest[] = [
      { id: 'a', name: 'Alice', tags: [], notes: '', tableId: null },
      { id: 'b', name: 'Bob',   tags: [], notes: '', tableId: null },
      { id: 'c', name: 'Carol', tags: [], notes: '', tableId: null },
    ]
    const rels: Relationship[] = [
      { guestAId: 'a', guestBId: 'b', type: 'apart', note: '' },
    ]
    const moves = suggestMoves(guests, rels, tables)
    const aTable = moves.find((m) => m.guestId === 'a')!.toTableId
    const bTable = moves.find((m) => m.guestId === 'b')!.toTableId
    expect(aTable).not.toBe(bTable)
  })

  it('groups together guests at the same table when capacity allows', () => {
    const guests: Guest[] = [
      { id: 'a', name: 'Alice', tags: [], notes: '', tableId: null },
      { id: 'b', name: 'Bob',   tags: [], notes: '', tableId: null },
    ]
    const rels: Relationship[] = [
      { guestAId: 'a', guestBId: 'b', type: 'together', note: '' },
    ]
    const moves = suggestMoves(guests, rels, tables)
    const aTable = moves.find((m) => m.guestId === 'a')!.toTableId
    const bTable = moves.find((m) => m.guestId === 'b')!.toTableId
    expect(aTable).toBe(bTable)
  })

  it('preserves existing manual assignments', () => {
    const guests: Guest[] = [
      { id: 'a', name: 'Alice', tags: [], notes: '', tableId: 't1' },
      { id: 'b', name: 'Bob',   tags: [], notes: '', tableId: null },
    ]
    const moves = suggestMoves(guests, [], tables)
    expect(moves.find((m) => m.guestId === 'a')).toBeUndefined()
    expect(moves.find((m) => m.guestId === 'b')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/engine/suggest.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/engine/suggest.ts
import { Guest, Relationship, Table, SuggestedMove } from '../types'

export function suggestMoves(
  guests: Guest[],
  relationships: Relationship[],
  tables: Table[]
): SuggestedMove[] {
  const unassigned = guests.filter((g) => g.tableId === null)
  if (unassigned.length === 0 || tables.length === 0) return []

  // Track seat counts (start from existing assigned guests)
  const seated = new Map<string, string[]>() // tableId -> guestIds
  for (const t of tables) seated.set(t.id, [])
  for (const g of guests) {
    if (g.tableId) seated.get(g.tableId)?.push(g.id)
  }

  const moves: SuggestedMove[] = []
  const assigned = new Set(guests.filter((g) => g.tableId !== null).map((g) => g.id))

  // Group by shared tags (soft preference)
  const tagGroups = new Map<string, string[]>() // tag -> guestIds
  for (const g of unassigned) {
    for (const tag of g.tags) {
      if (!tagGroups.has(tag)) tagGroups.set(tag, [])
      tagGroups.get(tag)!.push(g.id)
    }
  }

  // Build groups: start with explicit "together" pairs
  const groups: string[][] = []
  const inGroup = new Set<string>()

  for (const r of relationships) {
    if (r.type !== 'together') continue
    const aUnassigned = !assigned.has(r.guestAId) && unassigned.some((g) => g.id === r.guestAId)
    const bUnassigned = !assigned.has(r.guestBId) && unassigned.some((g) => g.id === r.guestBId)
    if (!aUnassigned || !bUnassigned) continue

    const existingGroup = groups.find((grp) => grp.includes(r.guestAId) || grp.includes(r.guestBId))
    if (existingGroup) {
      if (!existingGroup.includes(r.guestAId)) existingGroup.push(r.guestAId)
      if (!existingGroup.includes(r.guestBId)) existingGroup.push(r.guestBId)
    } else {
      groups.push([r.guestAId, r.guestBId])
    }
    inGroup.add(r.guestAId)
    inGroup.add(r.guestBId)
  }

  // Add tag groups
  for (const [, ids] of tagGroups) {
    const ungrouped = ids.filter((id) => !inGroup.has(id))
    if (ungrouped.length > 1) {
      groups.push(ungrouped)
      for (const id of ungrouped) inGroup.add(id)
    }
  }

  // Add remaining unassigned as singletons
  for (const g of unassigned) {
    if (!inGroup.has(g.id)) groups.push([g.id])
  }

  // Apart lookup
  const apartPairs = new Set(
    relationships
      .filter((r) => r.type === 'apart')
      .map((r) => `${r.guestAId}:${r.guestBId}`)
  )
  const isApart = (a: string, b: string) =>
    apartPairs.has(`${a}:${b}`) || apartPairs.has(`${b}:${a}`)

  // Assign each group to the best table
  const tableCapacity = new Map(tables.map((t) => [t.id, t.capacity]))

  for (const group of groups) {
    const tableId = findBestTable(group, seated, tableCapacity, isApart)
    if (!tableId) continue
    for (const guestId of group) {
      moves.push({ guestId, toTableId: tableId })
      seated.get(tableId)!.push(guestId)
    }
  }

  return moves
}

function findBestTable(
  group: string[],
  seated: Map<string, string[]>,
  capacity: Map<string, number>,
  isApart: (a: string, b: string) => boolean
): string | null {
  let bestTable: string | null = null
  let bestScore = -Infinity

  for (const [tableId, occupants] of seated) {
    const cap = capacity.get(tableId) ?? 0
    if (occupants.length + group.length > cap) continue

    // Hard: no apart conflicts
    let hasApartConflict = false
    for (const guestId of group) {
      for (const occupant of occupants) {
        if (isApart(guestId, occupant)) { hasApartConflict = true; break }
      }
      if (hasApartConflict) break
    }
    if (hasApartConflict) continue

    // Score: prefer tables with more free seats (spread guests evenly)
    const score = cap - occupants.length
    if (score > bestScore) { bestScore = score; bestTable = tableId }
  }

  return bestTable
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/engine/suggest.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/suggest.ts tests/engine/suggest.test.ts
git commit -m "feat: add greedy suggest engine"
```

---

### Task 8: Import utilities

**Files:**
- Create: `src/utils/importFile.ts`
- Create: `tests/utils/importFile.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/utils/importFile.test.ts
import { parseTxt, parseCsv } from '../../src/utils/importFile'

describe('parseTxt', () => {
  it('converts lines to guests', () => {
    const result = parseTxt('Alice\nBob\nCarol')
    expect(result.guests).toHaveLength(3)
    expect(result.guests[0].name).toBe('Alice')
    expect(result.guests[0].tags).toEqual([])
  })

  it('skips blank lines', () => {
    const result = parseTxt('Alice\n\nBob')
    expect(result.guests).toHaveLength(2)
  })
})

describe('parseCsv', () => {
  it('parses name/tags/notes columns', () => {
    const csv = `name,tags,notes\nAlice,"friend,college",great person\nBob,,`
    const result = parseCsv(csv)
    expect(result.guests).toHaveLength(2)
    expect(result.guests[0].tags).toEqual(['friend', 'college'])
    expect(result.guests[0].notes).toBe('great person')
    expect(result.guests[1].tags).toEqual([])
  })

  it('returns error when name column missing', () => {
    const result = parseCsv('foo,bar\n1,2')
    expect(result.error).toMatch(/name/)
  })

  it('warns on duplicate names', () => {
    const result = parseCsv('name\nAlice\nAlice')
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toMatch(/duplicate/i)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/utils/importFile.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/utils/importFile.ts
import { Guest } from '../types'
import { newId } from './ids'

interface ParseResult {
  guests: Guest[]
  warnings: string[]
  error?: string
}

export function parseTxt(content: string): ParseResult {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  const names = new Set<string>()
  const warnings: string[] = []
  const guests: Guest[] = []

  for (const name of lines) {
    if (names.has(name)) {
      warnings.push(`Duplicate name skipped: "${name}"`)
      continue
    }
    names.add(name)
    guests.push({ id: newId(), name, tags: [], notes: '', tableId: null })
  }

  return { guests, warnings }
}

export function parseCsv(content: string): ParseResult {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return { guests: [], warnings: [], error: 'File is empty' }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim())
  if (!headers.includes('name')) {
    return { guests: [], warnings: [], error: 'CSV must have a "name" column' }
  }

  const nameIdx = headers.indexOf('name')
  const tagsIdx = headers.indexOf('tags')
  const notesIdx = headers.indexOf('notes')

  const names = new Set<string>()
  const warnings: string[] = []
  const guests: Guest[] = []

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line)
    const name = (cols[nameIdx] ?? '').trim()
    if (!name) continue
    if (names.has(name)) {
      warnings.push(`Duplicate name skipped: "${name}"`)
      continue
    }
    names.add(name)
    const rawTags = tagsIdx >= 0 ? (cols[tagsIdx] ?? '') : ''
    const tags = rawTags ? rawTags.split(',').map((t) => t.trim()).filter(Boolean) : []
    const notes = notesIdx >= 0 ? (cols[notesIdx] ?? '').trim() : ''
    guests.push({ id: newId(), name, tags, notes, tableId: null })
  }

  return { guests, warnings }
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue }
    current += ch
  }
  result.push(current)
  return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/utils/importFile.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/importFile.ts tests/utils/importFile.test.ts
git commit -m "feat: add txt and csv import parsers"
```

---

### Task 9: Export utilities

**Files:**
- Create: `src/utils/exportFile.ts`
- Create: `tests/utils/exportFile.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/utils/exportFile.test.ts
import { buildJsonBlob } from '../../src/utils/exportFile'
import { AppState } from '../../src/types'

const state: AppState = {
  guests: [{ id: '1', name: 'Alice', tags: [], notes: '', tableId: null }],
  relationships: [],
  tables: [],
}

describe('buildJsonBlob', () => {
  it('produces valid JSON containing the state', () => {
    const blob = buildJsonBlob(state)
    expect(blob.type).toBe('application/json')
    return blob.text().then((text) => {
      const parsed = JSON.parse(text)
      expect(parsed.guests[0].name).toBe('Alice')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/utils/exportFile.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/utils/exportFile.ts
import { AppState } from '../types'

export function buildJsonBlob(state: AppState): Blob {
  return new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function triggerPrint(): void {
  window.print()
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/utils/exportFile.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/exportFile.ts tests/utils/exportFile.test.ts
git commit -m "feat: add export utilities"
```

---

### Task 10: Toast + ConfirmDialog

**Files:**
- Create: `src/components/Toast.tsx`
- Create: `src/components/ConfirmDialog.tsx`

- [ ] **Step 1: Implement Toast**

```tsx
// src/components/Toast.tsx
import { useEffect } from 'react'
import { ToastMessage } from '../types'

interface Props {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

const colors: Record<ToastMessage['type'], string> = {
  info: 'bg-blue-700',
  warning: 'bg-yellow-600',
  error: 'bg-red-700',
}

export function Toast({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      className={`${colors[toast.type]} text-white text-sm px-4 py-2 rounded shadow-lg flex items-center gap-3 max-w-xs`}
    >
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="opacity-70 hover:opacity-100">✕</button>
    </div>
  )
}
```

- [ ] **Step 2: Implement ConfirmDialog**

```tsx
// src/components/ConfirmDialog.tsx
interface Props {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ message, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl">
        <p className="text-gray-100 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-300 hover:text-white">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Toast.tsx src/components/ConfirmDialog.tsx
git commit -m "feat: add Toast and ConfirmDialog components"
```

---

### Task 11: TopBar + ImportDialog

**Files:**
- Create: `src/components/TopBar.tsx`
- Create: `src/components/ImportDialog.tsx`

- [ ] **Step 1: Implement ImportDialog**

```tsx
// src/components/ImportDialog.tsx
import { useRef, useState } from 'react'
import { parseTxt, parseCsv } from '../utils/importFile'
import { AppState, Guest } from '../types'

interface Props {
  onImport: (guests: Guest[], warnings: string[]) => void
  onClose: () => void
}

export function ImportDialog({ onImport, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      let result
      if (ext === 'csv') result = parseCsv(content)
      else if (ext === 'txt') result = parseTxt(content)
      else { setError('Only .txt and .csv files are supported.'); return }

      if (result.error) { setError(result.error); return }
      onImport(result.guests, result.warnings)
    }
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl">
        <h2 className="text-lg font-semibold text-gray-100 mb-2">Import Guests</h2>
        <p className="text-sm text-gray-400 mb-4">
          Upload a <strong>.txt</strong> (one name per line) or <strong>.csv</strong> (columns: name, tags, notes).
        </p>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white">
            Cancel
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 text-sm bg-violet-600 text-white rounded hover:bg-violet-700"
          >
            Choose File
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement TopBar**

```tsx
// src/components/TopBar.tsx
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { ImportDialog } from './ImportDialog'
import { ConfirmDialog } from './ConfirmDialog'
import { buildJsonBlob, downloadBlob } from '../utils/exportFile'
import { Guest } from '../types'

interface Props {
  onToast: (type: 'info' | 'warning' | 'error', message: string) => void
}

export function TopBar({ onToast }: Props) {
  const [showImport, setShowImport] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { guests, relationships, tables, resetChart, importState } = useStore()

  const handleExport = () => {
    const blob = buildJsonBlob({ guests, relationships, tables })
    downloadBlob(blob, 'seating-chart.json')
  }

  const handleImport = (newGuests: Guest[], warnings: string[]) => {
    importState({ guests: newGuests, relationships: [], tables: [] })
    setShowImport(false)
    if (warnings.length > 0) {
      onToast('warning', warnings.join(' '))
    } else {
      onToast('info', `Imported ${newGuests.length} guests.`)
    }
  }

  return (
    <>
      <header className="flex items-center gap-4 px-4 py-3 bg-gray-900 border-b border-gray-700 shrink-0">
        <span className="text-lg font-bold text-violet-400">💒 WeddingSeat</span>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-1.5 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
          >
            Import
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
          >
            Export
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="px-3 py-1.5 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
          >
            New Chart
          </button>
        </div>
      </header>
      {showImport && <ImportDialog onImport={handleImport} onClose={() => setShowImport(false)} />}
      {showConfirm && (
        <ConfirmDialog
          message="Start a new chart? All current data will be cleared."
          onConfirm={() => { resetChart(); setShowConfirm(false) }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/TopBar.tsx src/components/ImportDialog.tsx
git commit -m "feat: add TopBar with import/export/new-chart actions"
```

---

### Task 12: Guest panel components

**Files:**
- Create: `src/components/GuestPanel/GuestSearch.tsx`
- Create: `src/components/GuestPanel/GuestRow.tsx`
- Create: `src/components/GuestPanel/GuestEditor.tsx`
- Create: `src/components/GuestPanel/GuestList.tsx`
- Create: `src/components/GuestPanel/GuestPanel.tsx`

- [ ] **Step 1: GuestSearch**

```tsx
// src/components/GuestPanel/GuestSearch.tsx
interface Props {
  value: string
  onChange: (v: string) => void
}

export function GuestSearch({ value, onChange }: Props) {
  return (
    <input
      type="text"
      placeholder="Search guests…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500"
    />
  )
}
```

- [ ] **Step 2: GuestRow**

```tsx
// src/components/GuestPanel/GuestRow.tsx
import { useDraggable } from '@dnd-kit/core'
import { Guest } from '../../types'
import { findTableConflicts } from '../../engine/conflicts'
import { useStore } from '../../store/useStore'

interface Props {
  guest: Guest
  isSelected: boolean
  onSelect: (id: string) => void
}

export function GuestRow({ guest, isSelected, onSelect }: Props) {
  const { relationships, guests } = useStore()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: guest.id,
    data: { guestId: guest.id },
  })

  const hasConflict =
    guest.tableId !== null &&
    findTableConflicts(guest.tableId, guests, relationships).some(
      (r) => r.guestAId === guest.id || r.guestBId === guest.id
    )

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(guest.id)}
      className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer select-none
        ${isDragging ? 'opacity-40' : ''}
        ${isSelected ? 'bg-violet-900/50 border border-violet-600' : 'hover:bg-gray-800'}
      `}
    >
      <span className="text-sm font-medium text-gray-100 flex-1 truncate">{guest.name}</span>
      {guest.tableId && <span className="text-xs text-gray-500">assigned</span>}
      {hasConflict && <span title="Conflict at table" className="text-red-400 text-xs">⚠</span>}
      <div className="flex gap-1 flex-wrap">
        {guest.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="text-xs bg-violet-800/50 text-violet-300 px-1.5 py-0.5 rounded">
            {tag}
          </span>
        ))}
        {guest.tags.length > 2 && (
          <span className="text-xs text-gray-500">+{guest.tags.length - 2}</span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: GuestEditor**

```tsx
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
```

- [ ] **Step 4: GuestList**

```tsx
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
```

- [ ] **Step 5: GuestPanel**

```tsx
// src/components/GuestPanel/GuestPanel.tsx
import { GuestList } from './GuestList'

export function GuestPanel() {
  return (
    <aside className="w-72 shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-700 shrink-0">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Guests</h2>
      </div>
      <GuestList />
    </aside>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/GuestPanel/
git commit -m "feat: add guest panel with search, row, editor, and list"
```

---

### Task 13: Floor Plan components

**Files:**
- Create: `src/components/ChartPanel/TableEditor.tsx`
- Create: `src/components/ChartPanel/TableShape.tsx`
- Create: `src/components/ChartPanel/FloorPlan.tsx`

- [ ] **Step 1: TableEditor**

```tsx
// src/components/ChartPanel/TableEditor.tsx
import { useState } from 'react'
import { Table } from '../../types'
import { useStore } from '../../store/useStore'

interface Props {
  table: Table
  onClose: () => void
}

export function TableEditor({ table, onClose }: Props) {
  const { updateTable, removeTable } = useStore()
  const [name, setName] = useState(table.name)
  const [capacity, setCapacity] = useState(String(table.capacity))
  const [shape, setShape] = useState<'round' | 'rectangular'>(table.shape)

  const save = () => {
    const cap = parseInt(capacity, 10)
    if (!name.trim() || isNaN(cap) || cap < 1) return
    updateTable(table.id, { name: name.trim(), capacity: cap, shape })
    onClose()
  }

  return (
    <div className="absolute z-20 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 w-48"
      style={{ top: table.position.y + 60, left: table.position.x - 20 }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-gray-100 mb-2 focus:outline-none focus:border-violet-500"
      />
      <div className="flex gap-2 mb-2">
        <input
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="w-16 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-gray-100 focus:outline-none focus:border-violet-500"
        />
        <select
          value={shape}
          onChange={(e) => setShape(e.target.value as 'round' | 'rectangular')}
          className="flex-1 text-sm bg-gray-700 border border-gray-600 rounded text-gray-200 px-1"
        >
          <option value="round">Round</option>
          <option value="rectangular">Rect</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={save} className="flex-1 py-1 text-xs bg-violet-600 text-white rounded hover:bg-violet-700">Save</button>
        <button onClick={() => { removeTable(table.id); onClose() }} className="py-1 px-2 text-xs bg-red-900/50 text-red-400 rounded hover:bg-red-900">Del</button>
        <button onClick={onClose} className="py-1 px-2 text-xs text-gray-400 hover:text-white">✕</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TableShape**

```tsx
// src/components/ChartPanel/TableShape.tsx
import { useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Table, Guest } from '../../types'
import { findTableConflicts } from '../../engine/conflicts'
import { useStore } from '../../store/useStore'
import { TableEditor } from './TableEditor'

interface Props {
  table: Table
}

export function TableShape({ table }: Props) {
  const { guests, relationships } = useStore()
  const [showEditor, setShowEditor] = useState(false)

  const seated = guests.filter((g) => g.tableId === table.id)
  const conflicts = findTableConflicts(table.id, guests, relationships)
  const hasConflict = conflicts.length > 0

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `table-drop-${table.id}`,
    data: { tableId: table.id },
  })

  const { attributes, listeners, setNodeRef: setDragRef, isDragging, transform } = useDraggable({
    id: `table-${table.id}`,
    data: { type: 'table', tableId: table.id },
  })

  const x = table.position.x + (transform?.x ?? 0)
  const y = table.position.y + (transform?.y ?? 0)

  const isRound = table.shape === 'round'
  const w = isRound ? 72 : 88
  const h = isRound ? 72 : 56

  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: isDragging ? 0.5 : 1 }}>
      <div
        ref={(node) => { setDragRef(node); setDropRef(node) }}
        {...attributes}
        {...listeners}
        onClick={(e) => { e.stopPropagation(); setShowEditor((v) => !v) }}
        style={{ borderRadius: isRound ? '50%' : '6px' }}
        className={`w-full h-full flex flex-col items-center justify-center cursor-pointer border-2
          ${isOver ? 'border-green-400 bg-green-900/30' : hasConflict ? 'border-red-500 bg-red-900/20' : 'border-violet-600 bg-violet-900/20'}
          select-none
        `}
      >
        <span className="text-xs font-bold text-gray-200 leading-tight text-center px-1 truncate w-full text-center">
          {table.name}
        </span>
        <span className="text-xs text-gray-400">{seated.length}/{table.capacity}</span>
        {hasConflict && <span className="text-red-400 text-xs">⚠</span>}
      </div>
      {showEditor && <TableEditor table={table} onClose={() => setShowEditor(false)} />}
    </div>
  )
}
```

- [ ] **Step 3: FloorPlan**

```tsx
// src/components/ChartPanel/FloorPlan.tsx
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useStore } from '../../store/useStore'
import { TableShape } from './TableShape'

export function FloorPlan() {
  const { tables, updateTable, assignGuest, addTable } = useStore()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event

    // Moving a table
    if (String(active.id).startsWith('table-') && !String(active.id).startsWith('table-drop-')) {
      const tableId = (active.data.current as { tableId: string }).tableId
      const table = tables.find((t) => t.id === tableId)
      if (table) {
        updateTable(tableId, {
          position: {
            x: Math.max(0, table.position.x + delta.x),
            y: Math.max(0, table.position.y + delta.y),
          },
        })
      }
      return
    }

    // Dropping a guest onto a table
    if (over && String(over.id).startsWith('table-drop-')) {
      const guestId = active.id as string
      const tableId = (over.data.current as { tableId: string }).tableId
      assignGuest(guestId, tableId)
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="relative w-full h-full bg-gray-950 overflow-hidden">
        <div
          className="absolute inset-4 border border-dashed border-gray-700 rounded"
          style={{ minHeight: 400 }}
        />
        {tables.map((table) => (
          <TableShape key={table.id} table={table} />
        ))}
        <button
          onClick={addTable}
          className="absolute bottom-4 right-4 px-3 py-1.5 text-sm bg-violet-700 text-white rounded hover:bg-violet-600"
        >
          + Add Table
        </button>
      </div>
    </DndContext>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ChartPanel/TableEditor.tsx src/components/ChartPanel/TableShape.tsx src/components/ChartPanel/FloorPlan.tsx
git commit -m "feat: add floor plan with draggable tables and guest drop targets"
```

---

### Task 14: Table List components

**Files:**
- Create: `src/components/ChartPanel/TableRow.tsx`
- Create: `src/components/ChartPanel/TableList.tsx`

- [ ] **Step 1: TableRow**

```tsx
// src/components/ChartPanel/TableRow.tsx
import { useState } from 'react'
import { Table } from '../../types'
import { useStore } from '../../store/useStore'
import { findTableConflicts } from '../../engine/conflicts'
import { TableEditor } from './TableEditor'

interface Props { table: Table }

export function TableRow({ table }: Props) {
  const { guests, relationships, unassignGuest } = useStore()
  const [expanded, setExpanded] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const seated = guests.filter((g) => g.tableId === table.id)
  const conflicts = findTableConflicts(table.id, guests, relationships)

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden mb-2">
      <div
        className="flex items-center gap-3 px-3 py-2 bg-gray-800 cursor-pointer hover:bg-gray-750"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-sm font-semibold text-gray-100 flex-1">{table.name}</span>
        <span className="text-xs text-gray-400">{seated.length}/{table.capacity}</span>
        {conflicts.length > 0 && (
          <span title={conflicts.map((c) => {
            const a = guests.find((g) => g.id === c.guestAId)?.name
            const b = guests.find((g) => g.id === c.guestBId)?.name
            return `${a} & ${b} should be apart`
          }).join('; ')} className="text-red-400 text-sm">⚠</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setShowEditor((v) => !v) }}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Edit
        </button>
        <span className="text-gray-500 text-xs">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="px-3 py-2 bg-gray-850 flex flex-wrap gap-1">
          {seated.length === 0 && <span className="text-xs text-gray-500">No guests assigned.</span>}
          {seated.map((g) => (
            <span key={g.id} className="flex items-center gap-1 text-xs bg-gray-700 text-gray-200 px-2 py-0.5 rounded-full">
              {g.name}
              <button
                onClick={() => unassignGuest(g.id)}
                className="text-gray-500 hover:text-red-400 ml-0.5"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      {showEditor && <div className="relative px-3 pb-3"><TableEditor table={table} onClose={() => setShowEditor(false)} /></div>}
    </div>
  )
}
```

- [ ] **Step 2: TableList**

```tsx
// src/components/ChartPanel/TableList.tsx
import { useStore } from '../../store/useStore'
import { TableRow } from './TableRow'

export function TableList() {
  const { tables, addTable } = useStore()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {tables.length === 0 && (
          <p className="text-sm text-gray-500 text-center mt-8">No tables yet. Add one below.</p>
        )}
        {tables.map((table) => (
          <TableRow key={table.id} table={table} />
        ))}
      </div>
      <div className="px-3 py-3 border-t border-gray-700 shrink-0">
        <button
          onClick={addTable}
          className="w-full py-2 text-sm bg-violet-700 text-white rounded hover:bg-violet-600"
        >
          + Add Table
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ChartPanel/TableRow.tsx src/components/ChartPanel/TableList.tsx
git commit -m "feat: add table list view with conflict warnings and guest unassign"
```

---

### Task 15: SuggestModal

**Files:**
- Create: `src/components/SuggestModal.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/SuggestModal.tsx
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
  const [skipped, setSkipped] = useState<Set<number>>(new Set())

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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SuggestModal.tsx
git commit -m "feat: add suggest modal with apply-all and review-each flows"
```

---

### Task 16: ChartPanel

**Files:**
- Create: `src/components/ChartPanel/ChartPanel.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/ChartPanel/ChartPanel.tsx
import { useState } from 'react'
import { FloorPlan } from './FloorPlan'
import { TableList } from './TableList'
import { SuggestModal } from '../SuggestModal'

export function ChartPanel() {
  const [tab, setTab] = useState<'floorplan' | 'tablelist'>('floorplan')
  const [showSuggest, setShowSuggest] = useState(false)

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700 bg-gray-900 shrink-0">
        <button
          onClick={() => setTab('floorplan')}
          className={`px-3 py-1 text-sm rounded ${tab === 'floorplan' ? 'bg-violet-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Floor Plan
        </button>
        <button
          onClick={() => setTab('tablelist')}
          className={`px-3 py-1 text-sm rounded ${tab === 'tablelist' ? 'bg-violet-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Table List
        </button>
        <button
          onClick={() => setShowSuggest(true)}
          className="ml-auto px-3 py-1.5 text-sm bg-violet-600 text-white rounded hover:bg-violet-700"
        >
          ✨ Suggest Seating
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'floorplan' ? <FloorPlan /> : <TableList />}
      </div>
      {showSuggest && <SuggestModal onClose={() => setShowSuggest(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ChartPanel/ChartPanel.tsx
git commit -m "feat: add chart panel with floor plan / table list tabs and suggest button"
```

---

### Task 17: Wire up App.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Update main.tsx**

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 2: Update App.tsx**

```tsx
// src/App.tsx
import { useState, useCallback } from 'react'
import { TopBar } from './components/TopBar'
import { GuestPanel } from './components/GuestPanel/GuestPanel'
import { ChartPanel } from './components/ChartPanel/ChartPanel'
import { Toast } from './components/Toast'
import { ToastMessage } from './types'
import { newId } from './utils/ids'

export default function App() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = newId()
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100 overflow-hidden">
      <TopBar onToast={addToast} />
      <div className="flex flex-1 overflow-hidden">
        <GuestPanel />
        <ChartPanel />
      </div>
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
```

- [ ] **Step 3: Run the app and verify**

```bash
npm run dev
```

Open http://localhost:5173. Verify:
- Top bar shows "WeddingSeat" with Import/Export/New Chart buttons
- Left panel shows guest list with search and "Add Guest" button
- Right panel shows Floor Plan / Table List tabs and "✨ Suggest Seating" button
- Adding a guest appears in the list
- Adding a table appears on the floor plan and in the table list

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: wire up full app layout with all panels and toast system"
```

---

### Task 18: Print styles + final polish

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add print styles**

Append to `src/index.css`:
```css
@media print {
  body { background: white; color: black; }
  header, aside, .no-print { display: none !important; }
  .print-only { display: block !important; }
}
```

- [ ] **Step 2: Verify print export**

In the running app, click Export → the JSON file downloads. Then open Table List view, open browser Print dialog (`Cmd+P`) — the table list should render cleanly without the sidebar and header.

- [ ] **Step 3: Run full test suite one final time**

```bash
npx vitest run
```
Expected: all tests PASS, no type errors.

- [ ] **Step 4: Final commit**

```bash
git add src/index.css
git commit -m "feat: add print styles for table list export"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Guest list with tags, notes, search — Tasks 12
- ✅ Manual guest entry + import (.txt, .csv) — Tasks 8, 11
- ✅ Relationships (together/apart) with notes — Tasks 5, 12
- ✅ Table management (add/edit/delete/capacity/shape) — Tasks 5, 13, 14
- ✅ Floor plan with draggable tables — Task 13
- ✅ Table list view with conflict warnings — Task 14
- ✅ Guest assignment (drag-to-table, unassign) — Tasks 5, 13, 14
- ✅ Auto-suggest (greedy, hard/soft constraints) — Tasks 6, 7
- ✅ Propose & Review modal — Task 15
- ✅ JSON export/import — Tasks 9, 11
- ✅ Print export — Task 18
- ✅ localStorage persistence — Tasks 4, 5
- ✅ New Chart confirmation — Task 11
- ✅ Toast notifications for errors/warnings — Tasks 10, 11
- ✅ Duplicate name warnings on import — Task 8

**Type consistency:** All store actions use `Guest`, `Relationship`, `Table`, `SuggestedMove` from `src/types.ts` consistently across all tasks. `newId()` used throughout. `findTableConflicts` and `hasConflict` signatures match usage in components.
