// tests/store/useStore.test.ts
import { act, renderHook } from '@testing-library/react'
import { useStore } from '../../src/store/useStore'

beforeEach(() => {
  localStorage.clear()
  useStore.setState({ guests: [], relationships: [], tables: [] })
})

describe('guests', () => {
  it('adds a guest', () => {
    const { result } = renderHook(() => useStore())
    act(() => result.current.addGuest('Alice'))
    expect(result.current.guests).toHaveLength(1)
    expect(result.current.guests[0].name).toBe('Alice')
  })

  it('updates a guest', () => {
    const { result } = renderHook(() => useStore())
    act(() => result.current.addGuest('Alice'))
    const id = result.current.guests[0].id
    act(() => result.current.updateGuest(id, { name: 'Alice B', tags: ['friend'] }))
    expect(result.current.guests[0].name).toBe('Alice B')
    expect(result.current.guests[0].tags).toEqual(['friend'])
  })

  it('removes a guest and their relationships', () => {
    const { result } = renderHook(() => useStore())
    act(() => result.current.addGuest('Alice'))
    act(() => result.current.addGuest('Bob'))
    const aliceId = result.current.guests[0].id
    const bobId = result.current.guests[1].id
    act(() => result.current.addRelationship(aliceId, bobId, 'apart', ''))
    act(() => result.current.removeGuest(aliceId))
    expect(result.current.guests).toHaveLength(1)
    expect(result.current.relationships).toHaveLength(0)
  })
})

describe('tables', () => {
  it('adds a table', () => {
    const { result } = renderHook(() => useStore())
    act(() => result.current.addTable())
    expect(result.current.tables).toHaveLength(1)
    expect(result.current.tables[0].capacity).toBe(8)
  })

  it('removes a table and unassigns its guests', () => {
    const { result } = renderHook(() => useStore())
    act(() => result.current.addGuest('Alice'))
    act(() => result.current.addTable())
    const guestId = result.current.guests[0].id
    const tableId = result.current.tables[0].id
    act(() => result.current.assignGuest(guestId, tableId))
    act(() => result.current.removeTable(tableId))
    expect(result.current.tables).toHaveLength(0)
    expect(result.current.guests[0].tableId).toBeNull()
  })
})

describe('assignment', () => {
  it('assigns and unassigns a guest', () => {
    const { result } = renderHook(() => useStore())
    act(() => result.current.addGuest('Alice'))
    act(() => result.current.addTable())
    const guestId = result.current.guests[0].id
    const tableId = result.current.tables[0].id
    act(() => result.current.assignGuest(guestId, tableId))
    expect(result.current.guests[0].tableId).toBe(tableId)
    act(() => result.current.unassignGuest(guestId))
    expect(result.current.guests[0].tableId).toBeNull()
  })
})
