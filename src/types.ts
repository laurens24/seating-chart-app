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
  type: 'together' | 'apart' | 'plus-one'
  note: string
}

export interface Table {
  id: string
  name: string
  capacity: number
  position: { x: number; y: number }
  shape: 'round' | 'rect'
  seatOrder: string[]
}

export interface AppState {
  guests: Guest[]
  relationships: Relationship[]
  tables: Table[]
}

export interface ConflictResolution {
  type: 'apart' | 'plus-one'
  guestAName: string
  guestBName: string
  fromTableName: string | null
  toTableName: string
  action: string
}

export interface ToastMessage {
  id: string
  type: 'info' | 'warning' | 'error'
  message: string
  persistent?: boolean
  details?: ConflictResolution[]
}

export type OnToast = (
  type: 'info' | 'warning' | 'error',
  message: string,
  options?: { persistent?: boolean; details?: ConflictResolution[] },
) => void

export interface SuggestedMove {
  guestId: string
  toTableId: string
  insertIndex?: number
}
