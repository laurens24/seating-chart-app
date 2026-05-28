import { useRef, useState, useCallback, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { TableShape } from './TableShape'

const CANVAS_W = 3000
const CANVAS_H = 2000
const MAP_W = 150
const MAP_H = Math.round(MAP_W * (CANVAS_H / CANVAS_W)) // 100
const TABLE_FOOTPRINT_HALF = 84 // LABEL_ORBIT(64) + 20

interface Marquee { x1: number; y1: number; x2: number; y2: number }

function GuestArrow({ scroll, vpSize }: { scroll: { x: number; y: number }; vpSize: { w: number; h: number } }) {
  const { hoveredGuestId, guests, tables } = useStore()

  if (!hoveredGuestId || vpSize.w === 0) return null

  const guest = guests.find((g) => g.id === hoveredGuestId)
  if (!guest?.tableId) return null

  const table = tables.find((t) => t.id === guest.tableId)
  if (!table) return null

  const tx = table.position.x
  const ty = table.position.y

  const isVisible =
    tx + TABLE_FOOTPRINT_HALF > scroll.x &&
    tx - TABLE_FOOTPRINT_HALF < scroll.x + vpSize.w &&
    ty + TABLE_FOOTPRINT_HALF > scroll.y &&
    ty - TABLE_FOOTPRINT_HALF < scroll.y + vpSize.h

  if (isVisible) return null

  const vcx = vpSize.w / 2
  const vcy = vpSize.h / 2
  const dx = (tx - scroll.x) - vcx
  const dy = (ty - scroll.y) - vcy

  const MARGIN = 24
  const hw = vpSize.w / 2 - MARGIN
  const hh = vpSize.h / 2 - MARGIN

  let t = Infinity
  if (dx > 0) t = Math.min(t, hw / dx)
  if (dx < 0) t = Math.min(t, -hw / dx)
  if (dy > 0) t = Math.min(t, hh / dy)
  if (dy < 0) t = Math.min(t, -hh / dy)

  if (!isFinite(t)) return null

  const edgeX = vcx + dx * t
  const edgeY = vcy + dy * t
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)

  return (
    <div
      style={{
        position: 'absolute',
        left: edgeX,
        top: edgeY,
        transform: `translate(-50%, -50%) rotate(${angle}deg)`,
        pointerEvents: 'none',
        zIndex: 30,
      }}
      className="w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center shadow-md opacity-90"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <line x1="2" y1="8" x2="10" y2="8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <polygon points="9,3.5 15,8 9,12.5" fill="white" />
      </svg>
    </div>
  )
}

export function FloorPlan() {
  const { tables, addTable, setSelectedTableIds, defaultTableCapacity, setDefaultTableCapacity } = useStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scroll, setScroll] = useState({ x: 0, y: 0 })
  const [vpSize, setVpSize] = useState({ w: 0, h: 0 })
  const isDraggingMap = useRef(false)
  const [marquee, setMarquee] = useState<Marquee | null>(null)
  const isMarqueeing = useRef(false)
  const marqueeOrigin = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setVpSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setVpSize({ w: el.clientWidth, h: el.clientHeight })
    // Start scrolled to canvas center so the initial view matches where new tables are placed
    el.scrollLeft = CANVAS_W / 2 - el.clientWidth / 2
    el.scrollTop = CANVAS_H / 2 - el.clientHeight / 2
    return () => ro.disconnect()
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (el) setScroll({ x: el.scrollLeft, y: el.scrollTop })
  }, [])

  const toCanvas = useCallback((e: React.PointerEvent): { x: number; y: number } => {
    const el = scrollRef.current
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return {
      x: e.clientX - rect.left + el.scrollLeft,
      y: e.clientY - rect.top + el.scrollTop,
    }
  }, [])

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    // Only start marquee when clicking empty canvas space (not a table)
    if ((e.target as HTMLElement).closest('[data-table-shape]')) return
    const pos = toCanvas(e)
    isMarqueeing.current = true
    marqueeOrigin.current = pos
    setMarquee({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y })
    setSelectedTableIds(new Set())
  }, [toCanvas, setSelectedTableIds])

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMarqueeing.current) return
    const pos = toCanvas(e)
    setMarquee((prev) => prev ? { ...prev, x2: pos.x, y2: pos.y } : null)
  }, [toCanvas])

  const handleCanvasPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMarqueeing.current) return
    isMarqueeing.current = false
    const pos = toCanvas(e)
    const { x: ox, y: oy } = marqueeOrigin.current
    if (Math.hypot(pos.x - ox, pos.y - oy) > 5) {
      const minX = Math.min(ox, pos.x), maxX = Math.max(ox, pos.x)
      const minY = Math.min(oy, pos.y), maxY = Math.max(oy, pos.y)
      setSelectedTableIds(new Set(
        tables
          .filter((t) =>
            t.position.x + TABLE_FOOTPRINT_HALF > minX &&
            t.position.x - TABLE_FOOTPRINT_HALF < maxX &&
            t.position.y + TABLE_FOOTPRINT_HALF > minY &&
            t.position.y - TABLE_FOOTPRINT_HALF < maxY
          )
          .map((t) => t.id)
      ))
    }
    setMarquee(null)
  }, [toCanvas, tables, setSelectedTableIds])

  const scaleX = MAP_W / CANVAS_W
  const scaleY = MAP_H / CANVAS_H

  const scrollToMapPoint = useCallback((mx: number, my: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({
      left: mx / scaleX - el.clientWidth / 2,
      top: my / scaleY - el.clientHeight / 2,
    })
  }, [scaleX, scaleY])

  const handleMinimapPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingMap.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = e.currentTarget.getBoundingClientRect()
    scrollToMapPoint(e.clientX - rect.left, e.clientY - rect.top)
  }, [scrollToMapPoint])

  const handleMinimapPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingMap.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    scrollToMapPoint(e.clientX - rect.left, e.clientY - rect.top)
  }, [scrollToMapPoint])

  const handleMinimapPointerUp = useCallback(() => {
    isDraggingMap.current = false
  }, [])

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        className="w-full h-full overflow-auto"
      >
        <div style={{ width: CANVAS_W, height: CANVAS_H, position: 'relative' }}>
          <div className="absolute inset-4 border border-dashed border-stone-200 rounded pointer-events-none" />
          {tables.map((table) => (
            <TableShape key={table.id} table={table} />
          ))}
          {marquee && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(marquee.x1, marquee.x2),
                top: Math.min(marquee.y1, marquee.y2),
                width: Math.abs(marquee.x2 - marquee.x1),
                height: Math.abs(marquee.y2 - marquee.y1),
                border: '1.5px dashed #7c3aed',
                background: 'rgba(139, 92, 246, 0.08)',
                pointerEvents: 'none',
                zIndex: 20,
                borderRadius: 2,
              }}
            />
          )}
        </div>
      </div>
      <GuestArrow scroll={scroll} vpSize={vpSize} />

      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
        <button onClick={addTable} className="btn-primary">
          + Add Table
        </button>
        <div className="flex items-center gap-1 bg-white border border-stone-200 rounded px-2 py-1 shadow-sm">
          <label className="text-xs text-stone-500 select-none">Default seats</label>
          <input
            type="number"
            min={1}
            max={50}
            value={defaultTableCapacity}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10)
              if (!isNaN(n) && n >= 1 && n <= 50) setDefaultTableCapacity(n)
            }}
            className="w-10 text-xs text-center border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 py-0.5"
          />
        </div>
      </div>

      <div
        className="absolute bottom-4 right-4 z-20 rounded border border-stone-300 bg-stone-50 overflow-hidden cursor-crosshair select-none"
        style={{ width: MAP_W, height: MAP_H }}
        onPointerDown={handleMinimapPointerDown}
        onPointerMove={handleMinimapPointerMove}
        onPointerUp={handleMinimapPointerUp}
        onPointerCancel={handleMinimapPointerUp}
      >
        {tables.map((table) => (
          <div
            key={table.id}
            style={{
              position: 'absolute',
              left: table.position.x * scaleX,
              top: table.position.y * scaleY,
              width: table.shape === 'round' ? 5 : 7,
              height: table.shape === 'round' ? 5 : 4,
              borderRadius: table.shape === 'round' ? '50%' : '1px',
              background: '#7c3aed',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        ))}
        {vpSize.w > 0 && (
          <div
            style={{
              position: 'absolute',
              left: scroll.x * scaleX,
              top: scroll.y * scaleY,
              width: vpSize.w * scaleX,
              height: vpSize.h * scaleY,
              border: '1px solid rgba(139, 92, 246, 0.7)',
              background: 'rgba(139, 92, 246, 0.08)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    </div>
  )
}
