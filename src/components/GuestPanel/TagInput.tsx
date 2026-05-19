import { useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  value: string
  onChange: (value: string) => void
  allTags: string[]
  placeholder?: string
  className?: string
  onEnter?: () => void
}

export function TagInput({ value, onChange, allTags, placeholder, className, onEnter }: Props) {
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const [dropPos, setDropPos] = useState<{ x: number; y: number; w: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const parts = value.split(',')
  const currentToken = parts[parts.length - 1].trimStart()
  const alreadyTyped = new Set(parts.slice(0, -1).map((t) => t.trim().toLowerCase()))

  const suggestions = currentToken.length > 0
    ? allTags.filter(
        (t) => t.toLowerCase().includes(currentToken.toLowerCase()) && !alreadyTyped.has(t.toLowerCase())
      )
    : []

  const showDropdown = open && suggestions.length > 0

  const updatePosition = useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect()
    if (rect) setDropPos({ x: rect.left, y: rect.bottom, w: rect.width })
  }, [])

  const selectTag = (tag: string) => {
    const prefix = parts.slice(0, -1).join(',')
    onChange(prefix ? `${prefix}, ${tag}, ` : `${tag}, `)
    setOpen(false)
    setHighlightIdx(0)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightIdx((i) => Math.min(i + 1, suggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightIdx((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        selectTag(suggestions[highlightIdx])
        return
      }
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
    }
    if (e.key === 'Enter') onEnter?.()
  }

  return (
    <>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); setHighlightIdx(0); setOpen(true); updatePosition() }}
        onFocus={() => { setOpen(true); updatePosition() }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {showDropdown && dropPos && createPortal(
        <div
          style={{ position: 'fixed', left: dropPos.x, top: dropPos.y, width: dropPos.w, zIndex: 9999 }}
          className="bg-white border border-stone-200 rounded shadow-lg max-h-40 overflow-y-auto"
        >
          {suggestions.map((tag, i) => (
            <button
              key={tag}
              onMouseDown={(e) => { e.preventDefault(); selectTag(tag) }}
              className={`w-full text-left px-2 py-1.5 text-xs text-stone-800 ${i === highlightIdx ? 'bg-violet-100 text-violet-700' : 'hover:bg-stone-100'}`}
            >
              {tag}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
