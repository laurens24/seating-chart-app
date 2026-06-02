// src/components/GuestPanel/GuestSearch.tsx
interface Props {
  value: string
  onChange: (v: string) => void
}

export function GuestSearch({ value, onChange }: Props) {
  return (
    <input
      type="text"
      placeholder="Search guests…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-violet-500"
    />
  )
}
