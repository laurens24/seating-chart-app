import { useEffect } from 'react'
import { ToastMessage } from '../types'

interface Props {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
  onOpenDetails?: (toast: ToastMessage) => void
}

const colors: Record<ToastMessage['type'], string> = {
  info: 'bg-blue-700',
  warning: 'bg-yellow-600',
  error: 'bg-red-700',
}

export function Toast({ toasts, onDismiss, onOpenDetails }: Props) {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} onOpenDetails={onOpenDetails} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss, onOpenDetails }: {
  toast: ToastMessage
  onDismiss: (id: string) => void
  onOpenDetails?: (toast: ToastMessage) => void
}) {
  useEffect(() => {
    if (toast.persistent) return
    const timer = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, toast.persistent, onDismiss])

  const clickable = Boolean(toast.details && toast.details.length > 0 && onOpenDetails)

  return (
    <div
      onClick={clickable ? () => onOpenDetails!(toast) : undefined}
      className={`${colors[toast.type]} text-white text-sm px-4 py-2 rounded shadow-lg flex items-center gap-3 max-w-xs animate-toast-in ${clickable ? 'cursor-pointer hover:brightness-110' : ''}`}
    >
      <span className="flex-1">
        {toast.message}
        {clickable && <span className="block text-[11px] opacity-80 mt-0.5">Click for details</span>}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id) }}
        className="opacity-70 hover:opacity-100"
      >✕</button>
    </div>
  )
}
