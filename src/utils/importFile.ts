import { AppState, Guest, Relationship } from '../types'
import { newId } from './ids'

interface ParseResult {
  guests: Guest[]
  relationships: Relationship[]
  warnings: string[]
  error?: string
}

// Splits "Alice & Bob", "Alice + Bob", or "Alice and Bob" into two names, or returns null.
function splitCouple(raw: string): [string, string] | null {
  const m = raw.match(/^(.+?)\s+(?:&|\+|and)\s+(.+)$/i)
  return m ? [m[1].trim(), m[2].trim()] : null
}

// If one name has a last name and the other doesn't, copy the last name across.
function inferLastName(a: string, b: string): [string, string] {
  const aWords = a.split(/\s+/)
  const bWords = b.split(/\s+/)
  if (aWords.length > 1 && bWords.length === 1) return [a, b + ' ' + aWords[aWords.length - 1]]
  if (bWords.length > 1 && aWords.length === 1) return [a + ' ' + bWords[bWords.length - 1], b]
  return [a, b]
}

// Given a list of plus-one pairs (by guest ID), returns all relationships needed —
// including inferred ones for families (connected components of size > 2).
function buildPlusOneRelationships(plusOnePairs: [string, string][]): Relationship[] {
  if (plusOnePairs.length === 0) return []

  const allIds = new Set<string>()
  for (const [a, b] of plusOnePairs) { allIds.add(a); allIds.add(b) }

  const parent = new Map<string, string>()
  for (const id of allIds) parent.set(id, id)
  const find = (x: string): string => {
    if (parent.get(x) === x) return x
    const root = find(parent.get(x)!)
    parent.set(x, root)
    return root
  }
  for (const [a, b] of plusOnePairs) parent.set(find(a), find(b))

  const components = new Map<string, string[]>()
  for (const id of allIds) {
    const root = find(id)
    if (!components.has(root)) components.set(root, [])
    components.get(root)!.push(id)
  }

  const relationships: Relationship[] = []
  const added = new Set<string>()
  const pairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`)

  for (const [a, b] of plusOnePairs) {
    const k = pairKey(a, b)
    if (!added.has(k)) { added.add(k); relationships.push({ guestAId: a, guestBId: b, type: 'plus-one', note: '' }) }
  }

  for (const members of components.values()) {
    if (members.length <= 2) continue
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const k = pairKey(members[i], members[j])
        if (!added.has(k)) { added.add(k); relationships.push({ guestAId: members[i], guestBId: members[j], type: 'plus-one', note: '' }) }
      }
    }
  }

  return relationships
}

interface AppStateParseResult {
  state: AppState
  error?: string
}

export function parseJson(content: string): AppStateParseResult | ParseResult {
  let parsed: unknown
  try { parsed = JSON.parse(content) } catch {
    return { guests: [], relationships: [], warnings: [], error: 'Invalid JSON file.' }
  }
  if (
    parsed !== null && typeof parsed === 'object' &&
    'guests' in parsed && 'relationships' in parsed && 'tables' in parsed
  ) {
    const state = parsed as AppState
    if (!Array.isArray(state.guests) || !Array.isArray(state.relationships) || !Array.isArray(state.tables)) {
      return { guests: [], relationships: [], warnings: [], error: 'JSON file has an invalid structure.' }
    }
    return { state }
  }
  return { guests: [], relationships: [], warnings: [], error: 'JSON file is not a valid seating chart export.' }
}

export function parseTxt(content: string): ParseResult {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  const guests: Guest[] = []
  const plusOnePairs: [string, string][] = []

  for (const line of lines) {
    const couple = splitCouple(line)
    if (couple) {
      const [nameA, nameB] = inferLastName(...couple)
      const gA: Guest = { id: newId(), name: nameA, tags: [], notes: '', tableId: null }
      const gB: Guest = { id: newId(), name: nameB, tags: [], notes: '', tableId: null }
      guests.push(gA, gB)
      plusOnePairs.push([gA.id, gB.id])
    } else {
      guests.push({ id: newId(), name: line, tags: [], notes: '', tableId: null })
    }
  }

  return { guests, relationships: buildPlusOneRelationships(plusOnePairs), warnings: [] }
}

export function parseCsv(content: string): ParseResult {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return { guests: [], relationships: [], warnings: [], error: 'File is empty' }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim())
  if (!headers.includes('name')) {
    return { guests: [], relationships: [], warnings: [], error: 'CSV must have a "name" column' }
  }

  const nameIdx = headers.indexOf('name')
  const tagsIdx = headers.indexOf('tags')
  const notesIdx = headers.indexOf('notes')

  const guests: Guest[] = []
  const plusOnePairs: [string, string][] = []

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line)
    const rawName = (cols[nameIdx] ?? '').trim()
    if (!rawName) continue
    const rawTags = tagsIdx >= 0 ? (cols[tagsIdx] ?? '') : ''
    const tags = rawTags ? rawTags.split(',').map((t) => t.trim()).filter(Boolean) : []
    const notes = notesIdx >= 0 ? (cols[notesIdx] ?? '').trim() : ''

    const couple = splitCouple(rawName)
    if (couple) {
      const [nameA, nameB] = inferLastName(...couple)
      const gA: Guest = { id: newId(), name: nameA, tags, notes, tableId: null }
      const gB: Guest = { id: newId(), name: nameB, tags, notes, tableId: null }
      guests.push(gA, gB)
      plusOnePairs.push([gA.id, gB.id])
    } else {
      guests.push({ id: newId(), name: rawName, tags, notes, tableId: null })
    }
  }

  return { guests, relationships: buildPlusOneRelationships(plusOnePairs), warnings: [] }
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue }
    current += ch
  }
  result.push(current)
  return result
}
