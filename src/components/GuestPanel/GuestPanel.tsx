// src/components/GuestPanel/GuestPanel.tsx
import { GuestList } from './GuestList'

interface Props {
  onToast: (type: 'info' | 'warning' | 'error', message: string) => void
}

export function GuestPanel({ onToast }: Props) {
  return (
    <aside className="w-72 shrink-0 bg-white border-r border-stone-200 flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-stone-200 shrink-0">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-widest">Guests</h2>
      </div>
      <GuestList onToast={onToast} />
    </aside>
  )
}
