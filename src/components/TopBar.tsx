import { useState } from 'react'
import { useStore } from '../store/useStore'
import { ImportDialog } from './ImportDialog'
import { ConfirmDialog } from './ConfirmDialog'
import { buildJsonBlob, downloadBlob } from '../utils/exportFile'
import { Guest } from '../types'

interface Props {
  onToast: (type: 'info' | 'warning' | 'error', message: string) => void
}

export function TopBar({ onToast }: Props) {
  const [showImport, setShowImport] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { guests, relationships, tables, resetChart, importState } = useStore()

  const handleExport = () => {
    const blob = buildJsonBlob({ guests, relationships, tables })
    downloadBlob(blob, 'seating-chart.json')
  }

  const handleImport = (newGuests: Guest[], warnings: string[]) => {
    importState({ guests: newGuests, relationships: [], tables: [] })
    setShowImport(false)
    if (warnings.length > 0) {
      onToast('warning', warnings.join(' '))
    } else {
      onToast('info', `Imported ${newGuests.length} guests.`)
    }
  }

  return (
    <>
      <header className="flex items-center gap-4 px-4 py-3 bg-gray-900 border-b border-gray-700 shrink-0">
        <span className="text-lg font-bold text-violet-400">💒 WeddingSeat</span>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-1.5 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
          >
            Import
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
          >
            Export
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="px-3 py-1.5 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
          >
            New Chart
          </button>
        </div>
      </header>
      {showImport && <ImportDialog onImport={handleImport} onClose={() => setShowImport(false)} />}
      {showConfirm && (
        <ConfirmDialog
          message="Start a new chart? All current data will be cleared."
          onConfirm={() => { resetChart(); setShowConfirm(false) }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
