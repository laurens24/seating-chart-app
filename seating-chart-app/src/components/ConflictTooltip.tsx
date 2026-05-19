import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  lines: { color: string; prefix: string; text: string }[]
  children: React.ReactNode
  onPointerDown?: (e: React.PointerEvent) => void
}

export function ConflictTooltip({ lines, children, onPointerDown }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const ref = useRef<HTMLSpanElement>(null)

  const show = useCallback(() => {
    const rect = ref.current?.getBoundingClientRect()
    if (rect) setPos({ x: rect.left + rect.width / 2, y: rect.top })
  }, [])

  const hide = useCallback(() => setPos(null), [])

  return (
    <>
      <span
        ref={ref}
        className="cursor-help"
        onMouseEnter={show}
        onMouseLeave={hide}
        onPointerDown={onPointerDown}
      >
        {children}
      </span>
      {pos && createPortal(
        <div
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y - 8,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
          className="flex flex-col gap-0.5 bg-white border border-stone-200 rounded shadow-lg px-2 py-1.5 whitespace-nowrap"
        >
          {lines.map((line, i) => (
            <span key={i} className="text-xs text-stone-800">
              <span style={{ color: line.color }} className="mr-1">{line.prefix}</span>
              {line.text}
            </span>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
