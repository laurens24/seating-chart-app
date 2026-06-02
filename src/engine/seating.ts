import { Guest, Relationship, Table } from '../types'

export function getSeatedGuests(table: Table, guests: Guest[]): Guest[] {
  const guestById = new Map(guests.map((g) => [g.id, g]))
  const ordered: Guest[] = []
  const seen = new Set<string>()
  for (const id of table.seatOrder) {
    const g = guestById.get(id)
    if (g && g.tableId === table.id && !seen.has(id)) {
      ordered.push(g)
      seen.add(id)
    }
  }
  // Reconcile any guests assigned to this table but missing from seatOrder
  // (e.g. mid-migration or external state changes). Append them at the end.
  for (const g of guests) {
    if (g.tableId === table.id && !seen.has(g.id)) {
      ordered.push(g)
      seen.add(g.id)
    }
  }
  return ordered
}

export function getSeatAngles(count: number): number[] {
  if (count === 0) return []
  return Array.from({ length: count }, (_, i) => -90 + (360 / count) * i)
}

// Insert position when dropping on the orbit.
// Returns the index in the post-insert array where the dropped guest should go.
// pointer is in the table's local coordinates relative to its center.
export function computeOrbitInsertIndex(
  pointerDx: number,
  pointerDy: number,
  currentSeatCount: number,
): number {
  if (currentSeatCount === 0) return 0
  const angle = Math.atan2(pointerDy, pointerDx) * (180 / Math.PI)
  const post = currentSeatCount + 1
  let bestGap = 0
  let bestDelta = Infinity
  for (let i = 0; i < post; i++) {
    const gapAngle = -90 + (360 / post) * i
    const delta = Math.abs(((angle - gapAngle + 540) % 360) - 180)
    if (delta < bestDelta) {
      bestDelta = delta
      bestGap = i
    }
  }
  return bestGap
}

export function plusOnePartnerOf(guestId: string, relationships: Relationship[]): string | null {
  for (const r of relationships) {
    if (r.type !== 'plus-one') continue
    if (r.guestAId === guestId) return r.guestBId
    if (r.guestBId === guestId) return r.guestAId
  }
  return null
}

// Find an insert index that doesn't split any existing plus-one pair at this table.
// existingSeats: seatOrder of the table BEFORE inserting the new guest.
export function findSafeInsertIndex(
  desiredIndex: number,
  existingSeats: string[],
  relationships: Relationship[],
  excludeGuestId: string | null,
): number {
  const partnerOf = (gid: string) => plusOnePartnerOf(gid, relationships)
  const isUnsafeBetween = (i: number): boolean => {
    if (i <= 0 || i >= existingSeats.length) return false
    const left = existingSeats[i - 1]
    const right = existingSeats[i]
    if (left === excludeGuestId || right === excludeGuestId) return false
    return partnerOf(left) === right
  }

  const max = existingSeats.length
  for (let step = 0; step <= max; step++) {
    const forward = desiredIndex + step
    if (forward >= 0 && forward <= max && !isUnsafeBetween(forward)) return forward
    if (step === 0) continue
    const backward = desiredIndex - step
    if (backward >= 0 && backward <= max && !isUnsafeBetween(backward)) return backward
  }
  return Math.max(0, Math.min(desiredIndex, max))
}

// If the dropped guest's plus-one partner is already seated at this table,
// snap desiredIndex to keep the pair adjacent. Otherwise return desiredIndex.
export function snapToKeepPair(
  guestId: string,
  desiredIndex: number,
  existingSeats: string[],
  relationships: Relationship[],
): number {
  const partnerId = plusOnePartnerOf(guestId, relationships)
  if (!partnerId) return desiredIndex
  const partnerIdx = existingSeats.indexOf(partnerId)
  if (partnerIdx === -1) return desiredIndex
  const before = partnerIdx
  const after = partnerIdx + 1
  return Math.abs(desiredIndex - before) <= Math.abs(desiredIndex - after) ? before : after
}

// Insert index when dropping on the inner table area: keep plus-one partners adjacent.
export function middleDropInsertIndex(
  guestId: string,
  existingSeats: string[],
  relationships: Relationship[],
): number {
  const partnerId = plusOnePartnerOf(guestId, relationships)
  if (partnerId) {
    const idx = existingSeats.indexOf(partnerId)
    if (idx !== -1) return idx + 1
  }
  return existingSeats.length
}

// Order a group so plus-one pairs end up adjacent.
export function interleavePlusOnes(group: string[], relationships: Relationship[]): string[] {
  const inGroup = new Set(group)
  const placed = new Set<string>()
  const result: string[] = []
  for (const id of group) {
    if (placed.has(id)) continue
    result.push(id)
    placed.add(id)
    const partnerId = plusOnePartnerOf(id, relationships)
    if (partnerId && inGroup.has(partnerId) && !placed.has(partnerId)) {
      result.push(partnerId)
      placed.add(partnerId)
    }
  }
  return result
}
