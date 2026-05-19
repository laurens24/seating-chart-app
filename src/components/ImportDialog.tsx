import { useRef, useState } from 'react'
import { parseTxt, parseCsv, parseJson } from '../utils/importFile'
import { AppState, Guest, Relationship } from '../types'
import { useStore } from '../store/useStore'

interface Props {
  onImportGuests: (guests: Guest[], relationships: Relationship[], warnings: string[]) => void
  onImportState: (state: AppState) => void
  onClose: () => void
}

type Mode = 'guests' | 'paste' | 'chart'

interface PendingImport {
  guests: Guest[]
  relationships: Relationship[]
  warnings: string[]
  // indices into guests[] that are duplicates of existing names
  duplicateIndices: number[]
}

export function ImportDialog({ onImportGuests, onImportState, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<Mode>('guests')
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [editedNames, setEditedNames] = useState<Record<number, string>>({})

  const switchMode = (m: Mode) => { setMode(m); setError(null); setPending(null); setEditedNames({}) }

  const checkAndStage = (guests: Guest[], relationships: Relationship[], warnings: string[]) => {
    const existingNames = new Set(
      useStore.getState().guests.map((g) => g.name.trim().toLowerCase())
    )
    const duplicateIndices = guests
      .map((g, i) => ({ g, i }))
      .filter(({ g }) => existingNames.has(g.name.trim().toLowerCase()))
      .map(({ i }) => i)

    if (duplicateIndices.length === 0) {
      onImportGuests(guests, relationships, warnings)
      return
    }

    const initEdits: Record<number, string> = {}
    for (const i of duplicateIndices) initEdits[i] = guests[i].name
    setEditedNames(initEdits)
    setPending({ guests, relationships, warnings, duplicateIndices })
  }

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string

      if (ext === 'json') {
        const result = parseJson(content)
        if ('error' in result && result.error) { setError(result.error); return }
        if ('state' in result) { onImportState(result.state); return }
        setError('JSON file is not a valid seating chart export.')
        return
      }

      if (mode === 'chart') {
        setError('Chart imports require a .json file exported by this app.')
        return
      }

      let result
      if (ext === 'csv') result = parseCsv(content)
      else if (ext === 'txt') result = parseTxt(content)
      else { setError('Supported formats: .txt, .csv (guest list) or .json (chart export).'); return }

      if (result.error) { setError(result.error); return }
      checkAndStage(result.guests, result.relationships, result.warnings)
    }
    reader.readAsText(file)
  }

  const handlePasteImport = () => {
    const trimmed = pasteText.trim()
    if (!trimmed) { setError('Paste at least one name.'); return }
    const result = parseTxt(trimmed)
    if (result.error) { setError(result.error); return }
    checkAndStage(result.guests, result.relationships, result.warnings)
  }

  const commitWithEdits = () => {
    if (!pending) return
    const finalGuests = pending.guests.map((g, i) => {
      const edited = editedNames[i]
      return edited !== undefined ? { ...g, name: edited.trim() || g.name } : g
    })
    onImportGuests(finalGuests, pending.relationships, pending.warnings)
  }

  const accept = mode === 'chart' ? '.json' : '.txt,.csv,.json'
  const tabClass = (m: Mode) =>
    `flex-1 text-sm py-1 rounded transition-colors ${mode === m ? 'bg-violet-600 text-white' : 'text-stone-500 hover:text-stone-800'}`

  if (pending) {
    return (
      <div className="modal-backdrop">
        <div className="modal-panel max-w-sm w-full">
          <h2 className="text-lg font-semibold text-stone-900 mb-1">Duplicate Names</h2>
          <p className="text-sm text-stone-500 mb-4">
            The following names already exist. Edit them to import as new guests, or leave them to import anyway.
          </p>
          <div className="flex flex-col gap-2 mb-4 max-h-64 overflow-y-auto">
            {pending.duplicateIndices.map((i) => (
              <div key={i}>
                <label className="field-label mb-0.5 block">
                  "{pending.guests[i].name}" already exists
                </label>
                <input
                  className="input"
                  value={editedNames[i] ?? pending.guests[i].name}
                  onChange={(e) => setEditedNames((prev) => ({ ...prev, [i]: e.target.value }))}
                  placeholder="New name"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setPending(null); setEditedNames({}) }} className="btn-ghost">Back</button>
            <button onClick={commitWithEdits} className="btn-primary">Import</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-panel max-w-sm w-full">
        <h2 className="text-lg font-semibold text-stone-900 mb-3">Import</h2>

        <div className="flex gap-1 mb-4 bg-stone-200 rounded p-1">
          <button onClick={() => switchMode('guests')} className={tabClass('guests')}>Guest List</button>
          <button onClick={() => switchMode('paste')} className={tabClass('paste')}>Paste Names</button>
          <button onClick={() => switchMode('chart')} className={tabClass('chart')}>Full Chart</button>
        </div>

        {mode === 'guests' && (
          <p className="text-sm text-stone-500 mb-4">
            Upload a <strong>.txt</strong> (one name per line), <strong>.csv</strong> (columns: name, tags, notes),
            or a <strong>.json</strong> chart export to add its guests.
          </p>
        )}
        {mode === 'paste' && (
          <p className="text-sm text-stone-500 mb-2">
            Paste a list of names, one per line.
          </p>
        )}
        {mode === 'chart' && (
          <p className="text-sm text-stone-500 mb-4">
            Upload a <strong>.json</strong> file previously exported by this app. This will replace all current guests, tables, and relationships.
          </p>
        )}

        {mode === 'paste' && (
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"Alice Smith\nBob Jones\nCarol White"}
            rows={7}
            className="input mb-3 resize-none font-mono text-xs"
          />
        )}

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          {mode === 'paste' ? (
            <button onClick={handlePasteImport} className="btn-primary">Import</button>
          ) : (
            <button onClick={() => inputRef.current?.click()} className="btn-primary">Choose File</button>
          )}
        </div>
      </div>
    </div>
  )
}
