import { useEffect } from 'react'
import { ToastMessage } from '../types'

interface Props {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

const colors: Record<ToastMessage['type'], string> = {
  info: 'bg-blue-700',
  warning: 'bg-yellow-600',
  error: 'bg-red-700',
}

export function Toast({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      className={`${colors[toast.type]} text-white text-sm px-4 py-2 rounded shadow-lg flex items-center gap-3 max-w-xs`}
    >
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="opacity-70 hover:opacity-100">✕</button>
    </div>
  )
}
