import { AppState, Guest, Relationship } from '../types'
import { newId } from './ids'

interface ParseResult {
  guests: Guest[]
  relationships: Relationship[]
  warnings: string[]
  error?: string
}

// Splits "Alice & Bob" or "Alice and Bob" into two names, or returns null.
function splitCouple(raw: string): [string, string] | null {
  const m = raw.match(/^(.+?)\s+(?:&|and)\s+(.+)$/i)
  return m ? [m[1].trim(), m[2].trim()] : null
}

interface AppStateParseResult {
  state: AppState
  error?: string
}

export function parseJson(content: string): AppStateParseResult | ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return { guests: [], relationships: [], warnings: [], error: 'Invalid JSON file.' }
  }
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'guests' in parsed &&
    'relationships' in parsed &&
    'tables' in parsed
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
  const names = new Set<string>()
  const warnings: string[] = []
  const guests: Guest[] = []
  const relationships: Relationship[] = []

  for (const line of lines) {
    const couple = splitCouple(line)
    if (couple) {
      const [nameA, nameB] = couple
      const idA = newId()
      const idB = newId()
      for (const name of [nameA, nameB]) {
        if (names.has(name)) { warnings.push(`Duplicate name skipped: "${name}"`); continue }
        names.add(name)
      }
      const gA: Guest = { id: idA, name: nameA, tags: [], notes: '', tableId: null }
      const gB: Guest = { id: idB, name: nameB, tags: [], notes: '', tableId: null }
      guests.push(gA, gB)
      relationships.push({ guestAId: idA, guestBId: idB, type: 'plus-one', note: '' })
    } else {
      if (names.has(line)) { warnings.push(`Duplicate name skipped: "${line}"`); continue }
      names.add(line)
      guests.push({ id: newId(), name: line, tags: [], notes: '', tableId: null })
    }
  }

  return { guests, relationships, warnings }
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

  const names = new Set<string>()
  const warnings: string[] = []
  const guests: Guest[] = []
  const relationships: Relationship[] = []

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line)
    const rawName = (cols[nameIdx] ?? '').trim()
    if (!rawName) continue
    const rawTags = tagsIdx >= 0 ? (cols[tagsIdx] ?? '') : ''
    const tags = rawTags ? rawTags.split(',').map((t) => t.trim()).filter(Boolean) : []
    const notes = notesIdx >= 0 ? (cols[notesIdx] ?? '').trim() : ''

    const couple = splitCouple(rawName)
    if (couple) {
      const [nameA, nameB] = couple
      const idA = newId()
      const idB = newId()
      for (const name of [nameA, nameB]) {
        if (names.has(name)) { warnings.push(`Duplicate name skipped: "${name}"`); continue }
        names.add(name)
      }
      guests.push(
        { id: idA, name: nameA, tags, notes, tableId: null },
        { id: idB, name: nameB, tags, notes, tableId: null },
      )
      relationships.push({ guestAId: idA, guestBId: idB, type: 'plus-one', note: '' })
    } else {
      if (names.has(rawName)) { warnings.push(`Duplicate name skipped: "${rawName}"`); continue }
      names.add(rawName)
      guests.push({ id: newId(), name: rawName, tags, notes, tableId: null })
    }
  }

  return { guests, relationships, warnings }
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
