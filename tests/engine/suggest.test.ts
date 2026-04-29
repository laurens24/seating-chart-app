import { suggestMoves } from '../../src/engine/suggest'
import { Guest, Relationship, Table } from '../../src/types'

const tables: Table[] = [
  { id: 't1', name: 'Table 1', capacity: 3, position: { x: 0, y: 0 }, shape: 'round' },
  { id: 't2', name: 'Table 2', capacity: 3, position: { x: 0, y: 0 }, shape: 'round' },
]

describe('suggestMoves', () => {
  it('assigns all unassigned guests', () => {
    const guests: Guest[] = [
      { id: 'a', name: 'Alice', tags: [], notes: '', tableId: null },
      { id: 'b', name: 'Bob', tags: [], notes: '', tableId: null },
    ]
    const moves = suggestMoves(guests, [], tables)
    expect(moves).toHaveLength(2)
    expect(moves.every((m) => m.toTableId)).toBe(true)
  })

  it('never places apart guests at the same table when avoidable', () => {
    const guests: Guest[] = [
      { id: 'a', name: 'Alice', tags: [], notes: '', tableId: null },
      { id: 'b', name: 'Bob', tags: [], notes: '', tableId: null },
      { id: 'c', name: 'Carol', tags: [], notes: '', tableId: null },
    ]
    const rels: Relationship[] = [
      { guestAId: 'a', guestBId: 'b', type: 'apart', note: '' },
    ]
    const moves = suggestMoves(guests, rels, tables)
    const aTable = moves.find((m) => m.guestId === 'a')!.toTableId
    const bTable = moves.find((m) => m.guestId === 'b')!.toTableId
    expect(aTable).not.toBe(bTable)
  })

  it('groups together guests at the same table when capacity allows', () => {
    const guests: Guest[] = [
      { id: 'a', name: 'Alice', tags: [], notes: '', tableId: null },
      { id: 'b', name: 'Bob', tags: [], notes: '', tableId: null },
    ]
    const rels: Relationship[] = [
      { guestAId: 'a', guestBId: 'b', type: 'together', note: '' },
    ]
    const moves = suggestMoves(guests, rels, tables)
    const aTable = moves.find((m) => m.guestId === 'a')!.toTableId
    const bTable = moves.find((m) => m.guestId === 'b')!.toTableId
    expect(aTable).toBe(bTable)
  })

  it('preserves existing manual assignments', () => {
    const guests: Guest[] = [
      { id: 'a', name: 'Alice', tags: [], notes: '', tableId: 't1' },
      { id: 'b', name: 'Bob', tags: [], notes: '', tableId: null },
    ]
    const moves = suggestMoves(guests, [], tables)
    expect(moves.find((m) => m.guestId === 'a')).toBeUndefined()
    expect(moves.find((m) => m.guestId === 'b')).toBeDefined()
  })
})
