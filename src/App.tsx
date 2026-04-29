// src/App.tsx
import { useState, useCallback } from 'react'
import { TopBar } from './components/TopBar'
import { GuestPanel } from './components/GuestPanel/GuestPanel'
import { ChartPanel } from './components/ChartPanel/ChartPanel'
import { Toast } from './components/Toast'
import { ToastMessage } from './types'
import { newId } from './utils/ids'

export default function App() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = newId()
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100 overflow-hidden">
      <TopBar onToast={addToast} />
      <div className="flex flex-1 overflow-hidden">
        <GuestPanel />
        <ChartPanel />
      </div>
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
