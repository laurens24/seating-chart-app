import { parseTxt, parseCsv } from '../../src/utils/importFile'

describe('parseTxt', () => {
  it('converts lines to guests', () => {
    const result = parseTxt('Alice\nBob\nCarol')
    expect(result.guests).toHaveLength(3)
    expect(result.guests[0].name).toBe('Alice')
    expect(result.guests[0].tags).toEqual([])
  })

  it('skips blank lines', () => {
    const result = parseTxt('Alice\n\nBob')
    expect(result.guests).toHaveLength(2)
  })
})

describe('parseCsv', () => {
  it('parses name/tags/notes columns', () => {
    const csv = `name,tags,notes\nAlice,"friend,college",great person\nBob,,`
    const result = parseCsv(csv)
    expect(result.guests).toHaveLength(2)
    expect(result.guests[0].tags).toEqual(['friend', 'college'])
    expect(result.guests[0].notes).toBe('great person')
    expect(result.guests[1].tags).toEqual([])
  })

  it('returns error when name column missing', () => {
    const result = parseCsv('foo,bar\n1,2')
    expect(result.error).toMatch(/name/)
  })

  it('warns on duplicate names', () => {
    const result = parseCsv('name\nAlice\nAlice')
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toMatch(/duplicate/i)
  })
})
