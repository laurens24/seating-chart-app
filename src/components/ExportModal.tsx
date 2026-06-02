import { useState } from 'react'
import { useStore } from '../store/useStore'
import { buildJsonBlob, downloadBlob } from '../utils/exportFile'
import { getSeatedGuests } from '../engine/seating'

type ExportColumn = 'tableName' | 'guestName' | 'totalGuests' | 'capacity' | 'shape'

const COLUMNS: { id: ExportColumn; label: string }[] = [
  { id: 'tableName', label: 'Table Name' },
  { id: 'guestName', label: 'Guest Names (one per row)' },
  { id: 'totalGuests', label: 'Total Guests at Table' },
  { id: 'capacity', label: 'Table Capacity' },
  { id: 'shape', label: 'Table Shape' },
]

function buildCsv(
  columns: Set<ExportColumn>,
  tables: ReturnType<typeof useStore.getState>['tables'],
  guests: ReturnType<typeof useStore.getState>['guests'],
): string {
  const headers: string[] = []
  if (columns.has('tableName')) headers.push('Table')
  if (columns.has('guestName')) headers.push('Guest')
  if (columns.has('totalGuests')) headers.push('Total Guests')
  if (columns.has('capacity')) headers.push('Capacity')
  if (columns.has('shape')) headers.push('Shape')

  const rows: string[][] = []

  for (let ti = 0; ti < tables.length; ti++) {
    const table = tables[ti]
    const seated = getSeatedGuests(table, guests)

    if (columns.has('guestName') && seated.length > 0) {
      for (const guest of seated) {
        const row: string[] = []
        if (columns.has('tableName')) row.push(table.name)
        row.push(guest.name)
        if (columns.has('totalGuests')) row.push(String(seated.length))
        if (columns.has('capacity')) row.push(String(table.capacity))
        if (columns.has('shape')) row.push(table.shape)
        rows.push(row)
      }
    } else {
      const row: string[] = []
      if (columns.has('tableName')) row.push(table.name)
      if (columns.has('guestName')) row.push('')
      if (columns.has('totalGuests')) row.push(String(seated.length))
      if (columns.has('capacity')) row.push(String(table.capacity))
      if (columns.has('shape')) row.push(table.shape)
      rows.push(row)
    }

    if (ti < tables.length - 1) {
      rows.push(headers.map(() => ''))
    }
  }

  const escape = (v: string) => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v
  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n')
}

interface Props {
  onClose: () => void
}

export function ExportModal({ onClose }: Props) {
  const { guests, relationships, tables } = useStore()
  const [tab, setTab] = useState<'excel' | 'json'>('excel')
  const [columns, setColumns] = useState<Set<ExportColumn>>(new Set(['tableName', 'guestName', 'totalGuests', 'capacity']))

  const toggleColumn = (col: ExportColumn) => {
    setColumns((prev) => {
      const next = new Set(prev)
      next.has(col) ? next.delete(col) : next.add(col)
      return next
    })
  }

  const handleExportCsv = () => {
    if (columns.size === 0) return
    const csv = buildCsv(columns, tables, guests)
    const blob = new Blob([csv], { type: 'text/csv' })
    downloadBlob(blob, 'seating-chart.csv')
    onClose()
  }

  const handleExportJson = () => {
    const blob = buildJsonBlob({ guests, relationships, tables })
    downloadBlob(blob, 'seating-chart.json')
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel max-w-md w-full mx-4 animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Export</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-xl leading-none">✕</button>
        </div>

        <div className="flex gap-1 mb-4">
          <button
            onClick={() => setTab('excel')}
            className={`btn ${tab === 'excel' ? 'bg-violet-700 text-white' : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'}`}
          >
            Excel / CSV
          </button>
          <button
            onClick={() => setTab('json')}
            className={`btn ${tab === 'json' ? 'bg-violet-700 text-white' : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'}`}
          >
            JSON (re-import)
          </button>
        </div>

        {tab === 'excel' ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Choose columns to include. Tables are separated by a blank row.
            </p>
            <div className="flex flex-col gap-2">
              {COLUMNS.map((col) => (
                <label key={col.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={columns.has(col.id)}
                    onChange={() => toggleColumn(col.id)}
                    className="accent-violet-500"
                  />
                  <span className="text-sm text-stone-700 dark:text-stone-300">{col.label}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleExportCsv}
              disabled={columns.size === 0}
              className="btn-primary py-2 mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Download CSV
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Export your full seating chart as JSON. You can re-import this file later using "Add Multiple Guests" in the guest panel.
            </p>
            <button onClick={handleExportJson} className="btn-primary py-2 mt-2">
              Download JSON
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
