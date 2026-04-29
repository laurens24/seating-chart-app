import { AppState } from '../types'

export function buildJsonBlob(state: AppState): Blob {
  return new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function triggerPrint(): void {
  window.print()
}
