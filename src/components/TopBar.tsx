import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { ImportDialog } from './ImportDialog'
import { ConfirmDialog } from './ConfirmDialog'
import { buildJsonBlob, downloadBlob } from '../utils/exportFile'
import { AppState, Guest, Relationship } from '../types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{title}</p>
      <p className="leading-relaxed">{children}</p>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <span className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 text-xs font-mono">{children}</span>
}

interface Props {
  onToast: (type: 'info' | 'warning' | 'error', message: string) => void
}

export function TopBar({ onToast }: Props) {
  const [showImport, setShowImport] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const { guests, relationships, tables, resetChart, importState, undo, _history } = useStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo])

  const handleExport = () => {
    const blob = buildJsonBlob({ guests, relationships, tables })
    downloadBlob(blob, 'seating-chart.json')
  }

  const handleImportGuests = (newGuests: Guest[], newRelationships: Relationship[], warnings: string[]) => {
    const { guests: current, relationships: currentRel, tables: currentTables } = useStore.getState()
    importState({ guests: [...current, ...newGuests], relationships: [...currentRel, ...newRelationships], tables: currentTables })
    setShowImport(false)
    if (warnings.length > 0) {
      onToast('warning', warnings.join(' '))
    } else {
      onToast('info', `Imported ${newGuests.length} guest${newGuests.length !== 1 ? 's' : ''}.`)
    }
  }

  const handleImportState = (state: AppState) => {
    importState(state)
    setShowImport(false)
    onToast('info', `Chart restored: ${state.guests.length} guests, ${state.tables.length} tables.`)
  }

  return (
    <>
      <header className="flex items-center gap-4 px-4 py-3 bg-white border-b border-stone-200 shrink-0">
        <span className="text-lg font-bold text-violet-600">💒 WeddingSeat</span>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={undo}
            disabled={_history.length === 0}
            title="Undo (⌘Z)"
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Undo
          </button>
          <button onClick={() => setShowImport(true)} className="btn-secondary">Import</button>
          <button onClick={handleExport} className="btn-secondary">Export</button>
          <button onClick={() => setShowConfirm(true)} className="btn-secondary">New Chart</button>
          <button
            onClick={() => setShowHelp(true)}
            title="How to use WeddingSeat"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-200 text-stone-600 hover:bg-stone-300 hover:text-stone-900 text-sm font-bold"
          >
            ?
          </button>
        </div>
      </header>
      {showImport && (
        <ImportDialog
          onImportGuests={handleImportGuests}
          onImportState={handleImportState}
          onClose={() => setShowImport(false)}
        />
      )}
      {showConfirm && (
        <ConfirmDialog
          message="Start a new chart? All current data will be cleared."
          onConfirm={() => { resetChart(); setShowConfirm(false) }}
          onCancel={() => setShowConfirm(false)}
          onConfirmExport={() => { handleExport(); resetChart(); setShowConfirm(false) }}
        />
      )}
      {showHelp && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-violet-600">How to use WeddingSeat</h2>
              <button onClick={() => setShowHelp(false)} className="text-stone-500 hover:text-stone-900 text-xl leading-none">✕</button>
            </div>
            <div className="flex flex-col gap-3 text-sm text-stone-600">
              <Section title="Guests">
                Add guests with <Kbd>+ Add Guest</Kbd>. Click a guest to open their editor, where you can set their name, tags, notes, and relationships. Drag a guest row onto a table to seat them.
              </Section>
              <Section title="Relationships">
                In the guest editor, link two guests as <strong className="text-stone-900">together</strong> (prefer same table), <strong className="text-stone-900">apart</strong> (never same table), or <strong className="text-stone-900">plus-one</strong> (must be together). Drag one guest row onto another to quickly create a plus-one link.
              </Section>
              <Section title="Floor Plan">
                Add tables with <Kbd>+ Add Table</Kbd>. Drag tables to reposition them. Double-click a table's name or capacity to edit inline. Click the shape icon to toggle round/rectangular. Use the minimap in the bottom-right corner to navigate a large floor.
              </Section>
              <Section title="Conflict warnings">
                A red <span className="text-red-400">⚠</span> on a table means guests who should be apart are seated together, or plus-ones are split across tables. Hover the icon for details. A pink <span className="text-pink-400">⚠</span> on a guest label means their plus-one is at a different table.
              </Section>
              <Section title="Suggest Seating">
                Click <Kbd>✨ Suggest Seating</Kbd> to auto-assign unassigned guests while respecting all relationships. Review each move individually or apply them all at once.
              </Section>
              <Section title="Multi-select">
                Click <Kbd>Select</Kbd> in the guest panel to enter multi-select mode. Use checkboxes (shift-click for ranges) to bulk unassign or delete guests.
              </Section>
              <Section title="Undo / Import / Export">
                <Kbd>Undo</Kbd> reverts the last action (also <Kbd>⌘Z</Kbd>). <Kbd>Export</Kbd> saves your chart as JSON. <Kbd>Import</Kbd> loads a saved chart or a CSV guest list. Your chart auto-saves to your browser.
              </Section>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
