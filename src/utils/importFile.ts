import { Guest } from '../types'
import { newId } from './ids'

interface ParseResult {
  guests: Guest[]
  warnings: string[]
  error?: string
}

export function parseTxt(content: string): ParseResult {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  const names = new Set<string>()
  const warnings: string[] = []
  const guests: Guest[] = []

  for (const name of lines) {
    if (names.has(name)) {
      warnings.push(`Duplicate name skipped: "${name}"`)
      continue
    }
    names.add(name)
    guests.push({ id: newId(), name, tags: [], notes: '', tableId: null })
  }

  return { guests, warnings }
}

export function parseCsv(content: string): ParseResult {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return { guests: [], warnings: [], error: 'File is empty' }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim())
  if (!headers.includes('name')) {
    return { guests: [], warnings: [], error: 'CSV must have a "name" column' }
  }

  const nameIdx = headers.indexOf('name')
  const tagsIdx = headers.indexOf('tags')
  const notesIdx = headers.indexOf('notes')

  const names = new Set<string>()
  const warnings: string[] = []
  const guests: Guest[] = []

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line)
    const name = (cols[nameIdx] ?? '').trim()
    if (!name) continue
    if (names.has(name)) {
      warnings.push(`Duplicate name skipped: "${name}"`)
      continue
    }
    names.add(name)
    const rawTags = tagsIdx >= 0 ? (cols[tagsIdx] ?? '') : ''
    const tags = rawTags ? rawTags.split(',').map((t) => t.trim()).filter(Boolean) : []
    const notes = notesIdx >= 0 ? (cols[notesIdx] ?? '').trim() : ''
    guests.push({ id: newId(), name, tags, notes, tableId: null })
  }

  return { guests, warnings }
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
