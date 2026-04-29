import { buildJsonBlob } from '../../src/utils/exportFile'
import { AppState } from '../../src/types'

const state: AppState = {
  guests: [{ id: '1', name: 'Alice', tags: [], notes: '', tableId: null }],
  relationships: [],
  tables: [],
}

describe('buildJsonBlob', () => {
  it('produces valid JSON containing the state', () => {
    const blob = buildJsonBlob(state)
    expect(blob.type).toBe('application/json')
    return blob.text().then((text) => {
      const parsed = JSON.parse(text)
      expect(parsed.guests[0].name).toBe('Alice')
    })
  })
})
