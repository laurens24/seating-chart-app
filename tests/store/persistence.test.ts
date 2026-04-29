import { saveState, loadState } from '../../src/store/persistence'
import { AppState } from '../../src/types'

const sample: AppState = {
  guests: [{ id: '1', name: 'Alice', tags: ['friend'], notes: '', tableId: null }],
  relationships: [],
  tables: [],
}

describe('persistence', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips state through localStorage', () => {
    saveState(sample)
    expect(loadState()).toEqual(sample)
  })

  it('returns null when nothing is saved', () => {
    expect(loadState()).toBeNull()
  })
})
