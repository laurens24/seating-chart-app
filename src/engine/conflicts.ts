import { Guest, Relationship } from '../types'

export function hasGuestPlusOneConflict(guestId: string, guests: Guest[], relationships: Relationship[]): boolean {
  const guest = guests.find((g) => g.id === guestId)
  if (!guest) return false
  for (const r of relationships) {
    if (r.type !== 'plus-one') continue
    let partnerId: string | undefined
    if (r.guestAId === guestId) partnerId = r.guestBId
    else if (r.guestBId === guestId) partnerId = r.guestAId
    if (!partnerId) continue
    const partner = guests.find((g) => g.id === partnerId)
    if (!partner) continue
    // Both unassigned — not a conflict yet
    if (guest.tableId === null && partner.tableId === null) continue
    if (guest.tableId !== partner.tableId) return true
  }
  return false
}

export function findTableConflicts(
  tableId: string,
  guests: Guest[],
  relationships: Relationship[]
): Relationship[] {
  const seated = new Set(guests.filter((g) => g.tableId === tableId).map((g) => g.id))
  const conflicts: Relationship[] = []
  for (const r of relationships) {
    if (r.type === 'apart' && seated.has(r.guestAId) && seated.has(r.guestBId)) {
      conflicts.push(r)
    }
    if (r.type === 'plus-one') {
      const aSeated = seated.has(r.guestAId)
      const bSeated = seated.has(r.guestBId)
      const aGuest = guests.find((g) => g.id === r.guestAId)
      const bGuest = guests.find((g) => g.id === r.guestBId)
      // Conflict if one is at this table but the other is at a different table (not unassigned)
      if (aSeated && bGuest?.tableId && bGuest.tableId !== tableId) conflicts.push(r)
      if (bSeated && aGuest?.tableId && aGuest.tableId !== tableId) conflicts.push(r)
    }
  }
  return conflicts
}

export function hasConflict(
  guestId: string,
  tableId: string,
  guests: Guest[],
  relationships: Relationship[]
): boolean {
  const seated = new Set(guests.filter((g) => g.tableId === tableId).map((g) => g.id))
  return relationships.some((r) => {
    if (r.type === 'apart') {
      return (r.guestAId === guestId && seated.has(r.guestBId)) ||
             (r.guestBId === guestId && seated.has(r.guestAId))
    }
    if (r.type === 'plus-one') {
      // Conflict if being placed at a different table than the plus-one partner
      if (r.guestAId === guestId) {
        const partner = guests.find((g) => g.id === r.guestBId)
        return partner?.tableId != null && partner.tableId !== tableId
      }
      if (r.guestBId === guestId) {
        const partner = guests.find((g) => g.id === r.guestAId)
        return partner?.tableId != null && partner.tableId !== tableId
      }
    }
    return false
  })
}
