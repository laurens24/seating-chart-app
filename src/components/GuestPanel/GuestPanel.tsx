// src/components/GuestPanel/GuestPanel.tsx
import { GuestList } from './GuestList'
import { OnToast } from '../../types'

interface Props {
  onToast: OnToast
}

export function GuestPanel({ onToast }: Props) {
  return (
    <aside className="w-72 shrink-0 bg-white dark:bg-stone-800 border-r border-stone-200 dark:border-stone-700 flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-stone-200 dark:border-stone-700 shrink-0">
        <h2 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Guests</h2>
      </div>
      <GuestList onToast={onToast} />
    </aside>
  )
}
