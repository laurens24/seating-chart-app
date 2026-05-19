import { useRef, useState, useCallback, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { TableShape } from './TableShape'

const CANVAS_W = 3000
const CANVAS_H = 2000
const MAP_W = 150
const MAP_H = Math.round(MAP_W * (CANVAS_H / CANVAS_W)) // 100

export function FloorPlan() {
  const { tables, addTable } = useStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scroll, setScroll] = useState({ x: 0, y: 0 })
  const [vpSize, setVpSize] = useState({ w: 0, h: 0 })
  const isDraggingMap = useRef(false)

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
        className="w-full h-full overflow-auto"
      >
        <div style={{ width: CANVAS_W, height: CANVAS_H, position: 'relative' }}>
          <div className="absolute inset-4 border border-dashed border-stone-200 rounded" />
          {tables.map((table) => (
            <TableShape key={table.id} table={table} />
          ))}
        </div>
      </div>

      <button
        onClick={addTable}
        className="btn-primary absolute bottom-4 left-4 z-20"
      >
        + Add Table
      </button>

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
