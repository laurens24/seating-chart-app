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
