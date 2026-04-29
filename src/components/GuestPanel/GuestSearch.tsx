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
      className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500"
    />
  )
}
