import { useRef, useState } from 'react'
import { parseTxt, parseCsv } from '../utils/importFile'
import { Guest } from '../types'

interface Props {
  onImport: (guests: Guest[], warnings: string[]) => void
  onClose: () => void
}

export function ImportDialog({ onImport, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      let result
      if (ext === 'csv') result = parseCsv(content)
      else if (ext === 'txt') result = parseTxt(content)
      else { setError('Only .txt and .csv files are supported.'); return }

      if (result.error) { setError(result.error); return }
      onImport(result.guests, result.warnings)
    }
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl">
        <h2 className="text-lg font-semibold text-gray-100 mb-2">Import Guests</h2>
        <p className="text-sm text-gray-400 mb-4">
          Upload a <strong>.txt</strong> (one name per line) or <strong>.csv</strong> (columns: name, tags, notes).
        </p>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white">
            Cancel
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 text-sm bg-violet-600 text-white rounded hover:bg-violet-700"
          >
            Choose File
          </button>
        </div>
      </div>
    </div>
  )
}
