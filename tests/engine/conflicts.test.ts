import { findTableConflicts, hasConflict } from '../../src/engine/conflicts'
import { Guest, Relationship } from '../../src/types'

const guests: Guest[] = [
  { id: 'a', name: 'Alice', tags: [], notes: '', tableId: 't1' },
  { id: 'b', name: 'Bob',   tags: [], notes: '', tableId: 't1' },
  { id: 'c', name: 'Carol', tags: [], notes: '', tableId: 't2' },
]
const rels: Relationship[] = [
  { guestAId: 'a', guestBId: 'b', type: 'apart', note: 'fighting' },
  { guestAId: 'c', guestBId: 'a', type: 'apart', note: '' },
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
