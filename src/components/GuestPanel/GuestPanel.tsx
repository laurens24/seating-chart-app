// src/components/GuestPanel/GuestPanel.tsx
import { GuestList } from './GuestList'

export function GuestPanel() {
  return (
    <aside className="w-72 shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-700 shrink-0">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Guests</h2>
      </div>
      <GuestList />
    </aside>
  )
}
