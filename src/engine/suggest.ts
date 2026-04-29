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
        if (isApart(guestId, occupant)) {
          hasApartConflict = true
          break
        }
      }
      if (hasApartConflict) break
    }
    if (hasApartConflict) continue

    // Score: prefer tables with more free seats (spread guests evenly)
    const score = cap - occupants.length
    if (score > bestScore) {
      bestScore = score
      bestTable = tableId
    }
  }

  return bestTable
}
