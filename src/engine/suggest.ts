import { Guest, Relationship, Table, SuggestedMove } from '../types'
import { newId } from '../utils/ids'

const DEFAULT_CAPACITY = 8
const TABLE_STEP = 168
const TABLE_COLS = 5
const TABLE_ORIGIN_X = 1500 - Math.floor(TABLE_COLS / 2) * TABLE_STEP
const TABLE_ORIGIN_Y = 1000 - TABLE_STEP

function nextTablePosition(tables: Table[]): { x: number; y: number } {
  const overlaps = (cx: number, cy: number) =>
    tables.some((t) => Math.abs(t.position.x - cx) < TABLE_STEP && Math.abs(t.position.y - cy) < TABLE_STEP)
  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < TABLE_COLS; col++) {
      const pos = { x: TABLE_ORIGIN_X + col * TABLE_STEP, y: TABLE_ORIGIN_Y + row * TABLE_STEP }
      if (!overlaps(pos.x, pos.y)) return pos
    }
  }
  return { x: TABLE_ORIGIN_X, y: TABLE_ORIGIN_Y }
}

export interface SuggestResult {
  moves: SuggestedMove[]
  newTables: Table[]
}

export function suggestMoves(
  guests: Guest[],
  relationships: Relationship[],
  tables: Table[]
): SuggestResult {
  const unassigned = guests.filter((g) => g.tableId === null)
  if (unassigned.length === 0) return { moves: [], newTables: [] }

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
    if (r.type !== 'together' && r.type !== 'plus-one') continue
    const aUnassigned = !assigned.has(r.guestAId) && unassigned.some((g) => g.id === r.guestAId)
    const bUnassigned = !assigned.has(r.guestBId) && unassigned.some((g) => g.id === r.guestBId)

    // For plus-one: if one is already assigned, force the unassigned partner to the same table
    if (r.type === 'plus-one') {
      const aAssigned = assigned.has(r.guestAId)
      const bAssigned = assigned.has(r.guestBId)
      if (aAssigned && bUnassigned) {
        const targetTable = guests.find((g) => g.id === r.guestAId)?.tableId
        if (targetTable) {
          const seatedAtTarget = seated.get(targetTable)
          const cap = tables.find((t) => t.id === targetTable)?.capacity ?? 0
          if (seatedAtTarget && seatedAtTarget.length < cap) {
            moves.push({ guestId: r.guestBId, toTableId: targetTable })
            seatedAtTarget.push(r.guestBId)
            assigned.add(r.guestBId)
            inGroup.add(r.guestBId)
          }
        }
        continue
      }
      if (bAssigned && aUnassigned) {
        const targetTable = guests.find((g) => g.id === r.guestBId)?.tableId
        if (targetTable) {
          const seatedAtTarget = seated.get(targetTable)
          const cap = tables.find((t) => t.id === targetTable)?.capacity ?? 0
          if (seatedAtTarget && seatedAtTarget.length < cap) {
            moves.push({ guestId: r.guestAId, toTableId: targetTable })
            seatedAtTarget.push(r.guestAId)
            assigned.add(r.guestAId)
            inGroup.add(r.guestAId)
          }
        }
        continue
      }
    }
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

  // Plus-one partner lookup
  const plusOnePartner = new Map<string, string>()
  for (const r of relationships) {
    if (r.type !== 'plus-one') continue
    plusOnePartner.set(r.guestAId, r.guestBId)
    plusOnePartner.set(r.guestBId, r.guestAId)
  }

  // Build tag lookup for scoring
  const guestTags = new Map(guests.map((g) => [g.id, new Set(g.tags)]))

  // Assign each group to the best table, creating new tables as needed
  const tableCapacity = new Map(tables.map((t) => [t.id, t.capacity]))
  const newTables: Table[] = []
  const allTables = () => [...tables, ...newTables]

  const addNewTable = (neededSeats: number): string => {
    const cap = Math.max(DEFAULT_CAPACITY, neededSeats)
    const id = newId()
    const n = tables.length + newTables.length + 1
    const pos = nextTablePosition(allTables())
    const t: Table = { id, name: `Table ${n}`, capacity: cap, position: pos, shape: 'round' }
    newTables.push(t)
    seated.set(id, [])
    tableCapacity.set(id, cap)
    return id
  }

  for (const group of groups) {
    let tableId = findBestTable(group, seated, tableCapacity, isApart, guestTags, plusOnePartner)
    if (!tableId) {
      // Try placing each member individually, creating a new table only when truly stuck
      for (const guestId of group) {
        let singleTable = findBestTable([guestId], seated, tableCapacity, isApart, guestTags, plusOnePartner)
        if (!singleTable) singleTable = addNewTable(1)
        moves.push({ guestId, toTableId: singleTable })
        seated.get(singleTable)!.push(guestId)
      }
      continue
    }
    for (const guestId of group) {
      moves.push({ guestId, toTableId: tableId })
      seated.get(tableId)!.push(guestId)
    }
  }

  return { moves, newTables }
}

export function resolveConflicts(
  guests: Guest[],
  relationships: Relationship[],
  tables: Table[]
): SuggestResult {
  if (tables.length === 0) return { moves: [], newTables: [] }

  const guestTable = new Map<string, string | null>(guests.map((g) => [g.id, g.tableId]))
  const tableOccupants = new Map<string, Set<string>>()
  for (const t of tables) tableOccupants.set(t.id, new Set())
  for (const g of guests) {
    if (g.tableId) tableOccupants.get(g.tableId)?.add(g.id)
  }
  const tableCapacity = new Map(tables.map((t) => [t.id, t.capacity]))
  const moves: SuggestedMove[] = []
  const newTablesLocal: Table[] = []
  const allTablesNow = () => [...tables, ...newTablesLocal]

  const apartPairs = new Set(
    relationships.filter((r) => r.type === 'apart').map((r) => `${r.guestAId}:${r.guestBId}`)
  )
  const isApart = (a: string, b: string) =>
    apartPairs.has(`${a}:${b}`) || apartPairs.has(`${b}:${a}`)

  const makeNewTable = (): string => {
    const id = newId()
    const n = tables.length + newTablesLocal.length + 1
    const pos = nextTablePosition(allTablesNow())
    const t: Table = { id, name: `Table ${n}`, capacity: DEFAULT_CAPACITY, position: pos, shape: 'round' }
    newTablesLocal.push(t)
    tableOccupants.set(id, new Set())
    tableCapacity.set(id, DEFAULT_CAPACITY)
    return id
  }

  const moveGuest = (guestId: string, toTableId: string) => {
    const fromTable = guestTable.get(guestId)
    if (fromTable) tableOccupants.get(fromTable)?.delete(guestId)
    tableOccupants.get(toTableId)!.add(guestId)
    guestTable.set(guestId, toTableId)
    moves.push({ guestId, toTableId })
  }

  const canFit = (guestId: string, tableId: string): boolean => {
    const occupants = tableOccupants.get(tableId)
    const cap = tableCapacity.get(tableId) ?? 0
    if (!occupants || occupants.size >= cap) return false
    return ![...occupants].some((occ) => isApart(guestId, occ))
  }

  // Resolve apart conflicts: move the "B" guest out
  for (const r of relationships) {
    if (r.type !== 'apart') continue
    const aTable = guestTable.get(r.guestAId)
    const bTable = guestTable.get(r.guestBId)
    if (!aTable || !bTable || aTable !== bTable) continue
    let dest: string | null = null
    for (const [tid] of tableOccupants) {
      if (tid === aTable) continue
      if (canFit(r.guestBId, tid)) { dest = tid; break }
    }
    moveGuest(r.guestBId, dest ?? makeNewTable())
  }

  // Resolve plus-one splits: reunite partners
  for (const r of relationships) {
    if (r.type !== 'plus-one') continue
    const aTable = guestTable.get(r.guestAId)
    const bTable = guestTable.get(r.guestBId)
    if (!aTable || !bTable || aTable === bTable) continue
    if (canFit(r.guestBId, aTable)) { moveGuest(r.guestBId, aTable); continue }
    if (canFit(r.guestAId, bTable)) { moveGuest(r.guestAId, bTable); continue }
    // Neither partner's table has room — find or create a shared table
    let sharedTable: string | null = null
    for (const [tid, occupants] of tableOccupants) {
      if (tid === aTable || tid === bTable) continue
      const cap = tableCapacity.get(tid) ?? 0
      if (occupants.size + 2 > cap) continue
      if ([...occupants].some((occ) => isApart(r.guestAId, occ) || isApart(r.guestBId, occ))) continue
      sharedTable = tid
      break
    }
    const dest = sharedTable ?? makeNewTable()
    moveGuest(r.guestAId, dest)
    moveGuest(r.guestBId, dest)
  }

  return { moves, newTables: newTablesLocal }
}

function findBestTable(
  group: string[],
  seated: Map<string, string[]>,
  capacity: Map<string, number>,
  isApart: (a: string, b: string) => boolean,
  guestTags: Map<string, Set<string>>,
  plusOnePartner: Map<string, string>
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

    // Hard: no plus-one splits — if a guest has a plus-one partner, the partner must be
    // in this group OR already seated at this table, not at a different table
    let hasPlusOneSplit = false
    for (const guestId of group) {
      const partnerId = plusOnePartner.get(guestId)
      if (!partnerId) continue
      const partnerInGroup = group.includes(partnerId)
      const partnerAtTable = occupants.includes(partnerId)
      // Partner is assigned somewhere else (not this table, not unassigned)
      const partnerTableEntry = [...seated.entries()].find(([tid, occ]) => tid !== tableId && occ.includes(partnerId))
      if (!partnerInGroup && !partnerAtTable && partnerTableEntry) {
        hasPlusOneSplit = true; break
      }
    }
    if (hasPlusOneSplit) continue

    // Capacity spread score (0–cap range)
    const spreadScore = cap - occupants.length

    // Tag overlap bonus: count shared tags between any group member and any occupant
    let tagScore = 0
    for (const guestId of group) {
      const tags = guestTags.get(guestId)
      if (!tags || tags.size === 0) continue
      for (const occupantId of occupants) {
        const occupantTags = guestTags.get(occupantId)
        if (!occupantTags) continue
        for (const tag of tags) {
          if (occupantTags.has(tag)) tagScore++
        }
      }
    }

    const score = spreadScore + tagScore * 2
    if (score > bestScore) {
      bestScore = score
      bestTable = tableId
    }
  }

  return bestTable
}
