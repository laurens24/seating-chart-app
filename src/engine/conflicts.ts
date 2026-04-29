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
