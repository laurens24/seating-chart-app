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
    if (!raw) return null
    return migrate(JSON.parse(raw) as AppState)
  } catch {
    return null
  }
}

export function migrate(state: AppState): AppState {
  if (state.tables.every((t) => Array.isArray(t.seatOrder))) return state
  const tables = state.tables.map((t) => {
    if (Array.isArray(t.seatOrder)) return t
    const seatOrder = state.guests.filter((g) => g.tableId === t.id).map((g) => g.id)
    return { ...t, seatOrder }
  })
  return { ...state, tables }
}

export function clearState(): void {
  localStorage.removeItem(KEY)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}
