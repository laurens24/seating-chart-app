import { Guest, Relationship, Table, SuggestedMove, ConflictResolution } from '../types'
import { newId } from '../utils/ids'
import { interleavePlusOnes, plusOnePartnerOf } from './seating'

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

export interface TableRename {
  tableId: string
  newName: string
}

export interface SuggestResult {
  moves: SuggestedMove[]
  newTables: Table[]
  tableRenames: TableRename[]
  resolutions: ConflictResolution[]
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const isDefaultTableName = (name: string) => /^Table \d+$/.test(name)

function computeTableNames(
  moves: SuggestedMove[],
  newTables: Table[],
  guests: Guest[],
  relationships: Relationship[],
  existingTables: Table[]
): TableRename[] {
  const guestById = new Map(guests.map((g) => [g.id, g]))

  const plusOnePartners = new Map<string, Set<string>>()
  for (const r of relationships) {
    if (r.type !== 'plus-one') continue
    if (!plusOnePartners.has(r.guestAId)) plusOnePartners.set(r.guestAId, new Set())
    if (!plusOnePartners.has(r.guestBId)) plusOnePartners.set(r.guestBId, new Set())
    plusOnePartners.get(r.guestAId)!.add(r.guestBId)
    plusOnePartners.get(r.guestBId)!.add(r.guestAId)
  }

  // A guest qualifies for a tag if they have it directly, or any plus-one partner has it
  const qualifies = (guestId: string, tag: string): boolean => {
    const g = guestById.get(guestId)
    if (!g) return false
    if (g.tags.includes(tag)) return true
    for (const partnerId of (plusOnePartners.get(guestId) ?? [])) {
      if (guestById.get(partnerId)?.tags.includes(tag)) return true
    }
    return false
  }

  const computeTagForGroup = (guestIds: string[]): string | null => {
    if (guestIds.length === 0) return null
    const candidateTags = new Set<string>()
    for (const gid of guestIds) {
      for (const tag of (guestById.get(gid)?.tags ?? [])) candidateTags.add(tag)
      for (const partnerId of (plusOnePartners.get(gid) ?? [])) {
        for (const tag of (guestById.get(partnerId)?.tags ?? [])) candidateTags.add(tag)
      }
    }
    let bestTag: string | null = null
    let bestScore = -1
    for (const tag of candidateTags) {
      if (!guestIds.every((gid) => qualifies(gid, tag))) continue
      const directCount = guestIds.filter((gid) => guestById.get(gid)?.tags.includes(tag)).length
      if (directCount > bestScore) { bestScore = directCount; bestTag = tag }
    }
    return bestTag
  }

  const allTags = new Set<string>()
  for (const g of guests) for (const tag of g.tags) allTags.add(tag)
  const isAnyTagName = (name: string): boolean => {
    for (const tag of allTags) {
      if (name === tag || new RegExp(`^${escapeRe(tag)} \\d+$`).test(name)) return true
    }
    return false
  }

  // Compute each guest's post-move tableId so existing-table occupants reflect both
  // departures (suggestMoves: was null; resolveConflicts: moved out) and arrivals.
  const finalTableForGuest = new Map<string, string | null>()
  for (const g of guests) finalTableForGuest.set(g.id, g.tableId)
  for (const m of moves) finalTableForGuest.set(m.guestId, m.toTableId)

  type Target = { id: string; isNew: boolean; currentName: string; finalGuestIds: string[] }
  const targets: Target[] = []
  const occupantsByTable = new Map<string, string[]>()
  for (const [gid, tid] of finalTableForGuest) {
    if (!tid) continue
    if (!occupantsByTable.has(tid)) occupantsByTable.set(tid, [])
    occupantsByTable.get(tid)!.push(gid)
  }
  for (const t of newTables) {
    targets.push({ id: t.id, isNew: true, currentName: t.name, finalGuestIds: occupantsByTable.get(t.id) ?? [] })
  }
  for (const t of existingTables) {
    const hasIncoming = moves.some((m) => m.toTableId === t.id)
    if (!hasIncoming) continue
    targets.push({ id: t.id, isNew: false, currentName: t.name, finalGuestIds: occupantsByTable.get(t.id) ?? [] })
  }

  // Plan a tag for each renameable target. Existing tables only rename if their
  // current name is a default ("Table N") or already follows a tag pattern.
  const planned = new Map<string, string>()
  for (const t of targets) {
    const renameable = t.isNew || isDefaultTableName(t.currentName) || isAnyTagName(t.currentName)
    if (!renameable) continue
    const tag = computeTagForGroup(t.finalGuestIds)
    if (tag) planned.set(t.id, tag)
  }

  const plannedByTag = new Map<string, Target[]>()
  for (const t of targets) {
    const tag = planned.get(t.id)
    if (!tag) continue
    if (!plannedByTag.has(tag)) plannedByTag.set(tag, [])
    plannedByTag.get(tag)!.push(t)
  }

  // Tables that already match a tag pattern but aren't being renamed still occupy
  // numbers within that tag's namespace.
  const persistingCount = (tag: string): number => {
    const re = new RegExp(`^${escapeRe(tag)}( \\d+)?$`)
    return existingTables.filter((t) => !planned.has(t.id) && re.test(t.name)).length
  }

  const renames: TableRename[] = []
  for (const [tag, plannedTargets] of plannedByTag) {
    const existing = persistingCount(tag)
    const total = existing + plannedTargets.length
    let offset = existing
    for (const t of plannedTargets) {
      const newName = total === 1 ? tag : `${tag} ${++offset}`
      if (newName === t.currentName) continue
      if (t.isNew) {
        const nt = newTables.find((n) => n.id === t.id)
        if (nt) nt.name = newName
      } else {
        renames.push({ tableId: t.id, newName })
      }
    }
  }

  return renames
}

export function suggestMoves(
  guests: Guest[],
  relationships: Relationship[],
  tables: Table[],
  defaultCapacity: number = DEFAULT_CAPACITY
): SuggestResult {
  const unassigned = guests.filter((g) => g.tableId === null)
  if (unassigned.length === 0) return { moves: [], newTables: [], tableRenames: [], resolutions: [] }

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
            const partnerIdx = seatedAtTarget.indexOf(r.guestAId)
            const insertIndex = partnerIdx === -1 ? seatedAtTarget.length : partnerIdx + 1
            moves.push({ guestId: r.guestBId, toTableId: targetTable, insertIndex })
            seatedAtTarget.splice(insertIndex, 0, r.guestBId)
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
            const partnerIdx = seatedAtTarget.indexOf(r.guestBId)
            const insertIndex = partnerIdx === -1 ? seatedAtTarget.length : partnerIdx + 1
            moves.push({ guestId: r.guestAId, toTableId: targetTable, insertIndex })
            seatedAtTarget.splice(insertIndex, 0, r.guestAId)
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
    const cap = Math.max(defaultCapacity, neededSeats)
    const id = newId()
    const n = tables.length + newTables.length + 1
    const pos = nextTablePosition(allTables())
    const t: Table = { id, name: `Table ${n}`, capacity: cap, position: pos, shape: 'round', seatOrder: [] }
    newTables.push(t)
    seated.set(id, [])
    tableCapacity.set(id, cap)
    return id
  }

  for (const rawGroup of groups) {
    const group = interleavePlusOnes(rawGroup, relationships)
    let tableId = findBestTable(group, seated, tableCapacity, isApart, guestTags, plusOnePartner)
    if (!tableId) {
      // Try placing each member individually, creating a new table only when truly stuck
      for (const guestId of group) {
        let singleTable = findBestTable([guestId], seated, tableCapacity, isApart, guestTags, plusOnePartner)
        if (!singleTable) singleTable = addNewTable(1)
        const seats = seated.get(singleTable)!
        const partnerId = plusOnePartnerOf(guestId, relationships)
        const partnerIdx = partnerId ? seats.indexOf(partnerId) : -1
        const insertIndex = partnerIdx === -1 ? seats.length : partnerIdx + 1
        moves.push({ guestId, toTableId: singleTable, insertIndex })
        seats.splice(insertIndex, 0, guestId)
      }
      continue
    }
    const seats = seated.get(tableId)!
    for (const guestId of group) {
      const partnerId = plusOnePartnerOf(guestId, relationships)
      const partnerIdx = partnerId ? seats.indexOf(partnerId) : -1
      const insertIndex = partnerIdx === -1 ? seats.length : partnerIdx + 1
      moves.push({ guestId, toTableId: tableId, insertIndex })
      seats.splice(insertIndex, 0, guestId)
    }
  }

  const tableRenames = computeTableNames(moves, newTables, guests, relationships, tables)
  return { moves, newTables, tableRenames, resolutions: [] }
}

export function resolveConflicts(
  guests: Guest[],
  relationships: Relationship[],
  tables: Table[],
  defaultCapacity: number = DEFAULT_CAPACITY
): SuggestResult {
  if (tables.length === 0) return { moves: [], newTables: [], tableRenames: [], resolutions: [] }

  const guestTable = new Map<string, string | null>(guests.map((g) => [g.id, g.tableId]))
  const tableOccupants = new Map<string, Set<string>>()
  const tableSeatOrder = new Map<string, string[]>()
  for (const t of tables) {
    tableOccupants.set(t.id, new Set())
    tableSeatOrder.set(t.id, [...t.seatOrder])
  }
  for (const g of guests) {
    if (g.tableId) tableOccupants.get(g.tableId)?.add(g.id)
  }
  // Make sure seatOrder reflects current assignments (handles legacy data).
  for (const [tid, occupants] of tableOccupants) {
    const order = tableSeatOrder.get(tid) ?? []
    const filtered = order.filter((id) => occupants.has(id))
    for (const id of occupants) if (!filtered.includes(id)) filtered.push(id)
    tableSeatOrder.set(tid, filtered)
  }
  const tableCapacity = new Map(tables.map((t) => [t.id, t.capacity]))
  const moves: SuggestedMove[] = []
  const newTablesLocal: Table[] = []
  const allTablesNow = () => [...tables, ...newTablesLocal]
  type RawResolution = {
    type: 'apart' | 'plus-one'
    guestAId: string
    guestBId: string
    fromTableId: string | null
    toTableId: string
    action: string
  }
  const rawResolutions: RawResolution[] = []

  const apartPairs = new Set(
    relationships.filter((r) => r.type === 'apart').map((r) => `${r.guestAId}:${r.guestBId}`)
  )
  const isApart = (a: string, b: string) =>
    apartPairs.has(`${a}:${b}`) || apartPairs.has(`${b}:${a}`)

  const makeNewTable = (): string => {
    const id = newId()
    const n = tables.length + newTablesLocal.length + 1
    const pos = nextTablePosition(allTablesNow())
    const t: Table = { id, name: `Table ${n}`, capacity: defaultCapacity, position: pos, shape: 'round', seatOrder: [] }
    newTablesLocal.push(t)
    tableOccupants.set(id, new Set())
    tableSeatOrder.set(id, [])
    tableCapacity.set(id, defaultCapacity)
    return id
  }

  const moveGuest = (guestId: string, toTableId: string, insertIndex?: number) => {
    const fromTable = guestTable.get(guestId)
    if (fromTable) {
      tableOccupants.get(fromTable)?.delete(guestId)
      const fromOrder = tableSeatOrder.get(fromTable)
      if (fromOrder) tableSeatOrder.set(fromTable, fromOrder.filter((id) => id !== guestId))
    }
    tableOccupants.get(toTableId)!.add(guestId)
    const toOrder = tableSeatOrder.get(toTableId) ?? []
    const without = toOrder.filter((id) => id !== guestId)
    const idx = insertIndex !== undefined
      ? Math.max(0, Math.min(insertIndex, without.length))
      : without.length
    tableSeatOrder.set(toTableId, [...without.slice(0, idx), guestId, ...without.slice(idx)])
    guestTable.set(guestId, toTableId)
    moves.push({ guestId, toTableId, insertIndex: idx })
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
    const finalDest = dest ?? makeNewTable()
    const partnerId = plusOnePartnerOf(r.guestBId, relationships)
    const partnerIdxAtDest = partnerId
      ? (tableSeatOrder.get(finalDest) ?? []).indexOf(partnerId)
      : -1
    const insertIndex = partnerIdxAtDest === -1 ? undefined : partnerIdxAtDest + 1
    moveGuest(r.guestBId, finalDest, insertIndex)
    rawResolutions.push({
      type: 'apart',
      guestAId: r.guestAId,
      guestBId: r.guestBId,
      fromTableId: aTable,
      toTableId: finalDest,
      action: dest ? 'moved to a different table' : 'moved to a new table',
    })
  }

  // Resolve plus-one splits: reunite partners
  for (const r of relationships) {
    if (r.type !== 'plus-one') continue
    const aTable = guestTable.get(r.guestAId)
    const bTable = guestTable.get(r.guestBId)
    if (!aTable || !bTable || aTable === bTable) continue
    if (canFit(r.guestBId, aTable)) {
      const partnerIdx = (tableSeatOrder.get(aTable) ?? []).indexOf(r.guestAId)
      const insertIndex = partnerIdx === -1 ? undefined : partnerIdx + 1
      moveGuest(r.guestBId, aTable, insertIndex)
      rawResolutions.push({
        type: 'plus-one', guestAId: r.guestAId, guestBId: r.guestBId,
        fromTableId: bTable, toTableId: aTable,
        action: 'reunited with their plus-one',
      })
      continue
    }
    if (canFit(r.guestAId, bTable)) {
      const partnerIdx = (tableSeatOrder.get(bTable) ?? []).indexOf(r.guestBId)
      const insertIndex = partnerIdx === -1 ? undefined : partnerIdx + 1
      moveGuest(r.guestAId, bTable, insertIndex)
      rawResolutions.push({
        type: 'plus-one', guestAId: r.guestBId, guestBId: r.guestAId,
        fromTableId: aTable, toTableId: bTable,
        action: 'reunited with their plus-one',
      })
      continue
    }
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
    const fromForA = aTable
    moveGuest(r.guestAId, dest)
    // Place B immediately after A.
    const aIdx = (tableSeatOrder.get(dest) ?? []).indexOf(r.guestAId)
    moveGuest(r.guestBId, dest, aIdx === -1 ? undefined : aIdx + 1)
    rawResolutions.push({
      type: 'plus-one', guestAId: r.guestAId, guestBId: r.guestBId,
      fromTableId: fromForA, toTableId: dest,
      action: sharedTable ? 'moved together to a shared table' : 'moved together to a new table',
    })
  }

  const tableRenames = computeTableNames(moves, newTablesLocal, guests, relationships, tables)

  const renameById = new Map(tableRenames.map((r) => [r.tableId, r.newName]))
  const tableNameById = new Map<string, string>()
  for (const t of tables) tableNameById.set(t.id, renameById.get(t.id) ?? t.name)
  for (const t of newTablesLocal) tableNameById.set(t.id, t.name)
  const guestNameById = new Map(guests.map((g) => [g.id, g.name]))
  const resolutions: ConflictResolution[] = rawResolutions.map((r) => ({
    type: r.type,
    guestAName: guestNameById.get(r.guestAId) ?? r.guestAId,
    guestBName: guestNameById.get(r.guestBId) ?? r.guestBId,
    fromTableName: r.fromTableId ? (tableNameById.get(r.fromTableId) ?? null) : null,
    toTableName: tableNameById.get(r.toTableId) ?? r.toTableId,
    action: r.action,
  }))

  return { moves, newTables: newTablesLocal, tableRenames, resolutions }
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
