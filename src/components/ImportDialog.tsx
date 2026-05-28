import { useRef, useState } from 'react'
import { parseTxt, parseCsv, parseJson } from '../utils/importFile'
import { AppState, Guest, Relationship } from '../types'
import { useStore } from '../store/useStore'
import { DuplicateModal, DuplicateGroup } from './DuplicateModal'

interface Props {
  onImportGuests: (guests: Guest[], relationships: Relationship[], warnings: string[]) => void
  onImportState: (state: AppState) => void
  onClose: () => void
}

type Mode = 'paste' | 'file'

interface Staged {
  guests: Guest[]
  relationships: Relationship[]
  warnings: string[]
  dupGroups: DuplicateGroup[]
}

export function ImportDialog({ onImportGuests, onImportState, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<Mode>('paste')
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [staged, setStaged] = useState<Staged | null>(null)

  const switchMode = (m: Mode) => { setMode(m); setError(null); setStaged(null) }

  const checkAndStage = (guests: Guest[], relationships: Relationship[], warnings: string[]) => {
    const existingNames = new Map(
      useStore.getState().guests.map((g) => [g.name.trim().toLowerCase(), g])
    )

    // Find name collisions: within the import batch, or against the existing store
    const nameToGuests = new Map<string, Guest[]>()
    for (const g of guests) {
      const key = g.name.trim().toLowerCase()
      if (!nameToGuests.has(key)) nameToGuests.set(key, [])
      nameToGuests.get(key)!.push(g)
    }

    const dupGroups: DuplicateGroup[] = []
    for (const [key, batch] of nameToGuests) {
      const existing = existingNames.get(key)
      if (batch.length > 1 || existing) {
        const all = existing ? [existing, ...batch] : batch
        dupGroups.push({ name: all[0].name, guests: all })
      }
    }

    if (dupGroups.length === 0) {
      onImportGuests(guests, relationships, warnings)
      return
    }

    setStaged({ guests, relationships, warnings, dupGroups })
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

  const handleDuplicateResolve = (renamedGuests: Guest[], deletedIds: Set<string>) => {
    if (!staged) return

    // Apply renames
    const renamedById = new Map(renamedGuests.map((g) => [g.id, g]))
    // Existing store guests that got renamed should update the store — but that's
    // out of scope for import; only new guests are imported. Filter out any existing
    // store guest IDs from the import batch.
    const existingIds = new Set(useStore.getState().guests.map((g) => g.id))

    const finalGuests = staged.guests
      .filter((g) => !deletedIds.has(g.id))
      .map((g) => renamedById.get(g.id) ?? g)

    // Also handle store guests that were renamed: update them directly
    const storeRenames = renamedGuests.filter((g) => existingIds.has(g.id))
    if (storeRenames.length > 0) {
      const { updateGuest } = useStore.getState()
      for (const g of storeRenames) updateGuest(g.id, { name: g.name })
    }

    // Remap relationships from deleted guests to their duplicate-group survivor, then deduplicate
    const deletedToSurvivor = new Map<string, string>()
    for (const group of staged.dupGroups) {
      const survivors = group.guests.filter((g) => !deletedIds.has(g.id))
      const deleted = group.guests.filter((g) => deletedIds.has(g.id))
      if (survivors.length > 0) {
        const survivor = survivors.find((g) => existingIds.has(g.id)) ?? survivors[0]
        for (const d of deleted) deletedToSurvivor.set(d.id, survivor.id)
      }
    }
    const pairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`)
    const seen = new Set<string>()
    const finalRelationships = staged.relationships
      .map((r) => ({
        ...r,
        guestAId: deletedToSurvivor.get(r.guestAId) ?? r.guestAId,
        guestBId: deletedToSurvivor.get(r.guestBId) ?? r.guestBId,
      }))
      .filter((r) => {
        if (deletedIds.has(r.guestAId) || deletedIds.has(r.guestBId)) return false
        if (r.guestAId === r.guestBId) return false
        const k = pairKey(r.guestAId, r.guestBId)
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })

    onImportGuests(finalGuests, finalRelationships, staged.warnings)
    setStaged(null)
  }

  const tabClass = (m: Mode) =>
    `flex-1 text-sm py-1 rounded transition-colors ${mode === m ? 'bg-violet-600 text-white' : 'text-stone-500 hover:text-stone-800'}`

  if (staged) {
    return (
      <DuplicateModal
        groups={staged.dupGroups}
        relationships={staged.relationships}
        importGuests={staged.guests}
        onResolve={handleDuplicateResolve}
        onCancel={() => setStaged(null)}
      />
    )
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-panel max-w-sm w-full">
        <h2 className="text-lg font-semibold text-stone-900 mb-3">Import</h2>

        <div className="flex gap-1 mb-4 bg-stone-200 rounded p-1">
          <button onClick={() => switchMode('paste')} className={tabClass('paste')}>Paste Names</button>
          <button onClick={() => switchMode('file')} className={tabClass('file')}>From a File</button>
        </div>

        {mode === 'paste' && (
          <p className="text-sm text-stone-500 mb-2">
            One name per line. Two names on a line separated by <strong>&amp;</strong>, <strong>+</strong>, or <strong>and</strong> will be linked as plus-ones.
          </p>
        )}
        {mode === 'file' && (
          <p className="text-sm text-stone-500 mb-4">
            Upload a <strong>.txt</strong> (one name per line), <strong>.csv</strong> (columns: name, tags, notes),
            or a <strong>.json</strong> chart export.
          </p>
        )}

        {mode === 'paste' && (
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"Alice Smith\nBob Jones & Carol White\nDavid Brown"}
            rows={7}
            className="input mb-3 resize-none font-mono text-xs"
          />
        )}

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <input
          ref={inputRef}
          type="file"
          accept=".txt,.csv,.json"
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
