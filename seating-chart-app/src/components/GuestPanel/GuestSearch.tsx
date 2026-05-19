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
      className="w-full px-3 py-2 text-sm bg-stone-100 border border-stone-200 rounded text-stone-900 placeholder-stone-400 focus:outline-none focus:border-violet-500"
    />
  )
}
