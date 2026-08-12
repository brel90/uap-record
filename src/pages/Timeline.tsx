import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useConnections } from '@/hooks/useConnections'
import type { RawEvent, RawConnection } from '@/hooks/useConnections'
import { ERA_CONFIG, CONNECTION_TYPE_CONFIG } from '@/lib/constants'
import type { Era, ConnectionType } from '@/lib/types'
import './timeline.css'

// ── Layout constants ──────────────────────────────────────

const TRACK_W = 7600
const PAD = 60
const LANE = 56
const MIN_GAP = 100
const MAX_DEPTH = 5

const MONTHS = ['', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

// ── Types ──────────────────────────────────────────────────

interface LayoutEvent extends RawEvent {
  year: number
  x: number
  side: 'up' | 'down'
  depth: number
}

interface ConnRef extends RawConnection {
  dir: 'from' | 'to'
  otherId: string
}

interface EraBand {
  era: Era
  leftPx: number
  widthPx: number
  color: string
  label: string
}

interface Tick {
  year: number
  leftPx: number
}

// ── Helpers ───────────────────────────────────────────────

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function fmtDate(e: RawEvent): string {
  if (e.date_start) {
    const [y, m, d] = e.date_start.split('-')
    if (e.date_precision === 'day') return `${MONTHS[+m]} ${+d}, ${y}`
    if (e.date_precision === 'month') return `${MONTHS[+m]} ${y}`
    return y
  }
  return e.date_year_start ? String(e.date_year_start) : ''
}

// ── Layout computation ───────────────────────────────────

function computeLayout(rawEvents: RawEvent[], rawConnections: RawConnection[]) {
  const events: LayoutEvent[] = rawEvents.map(e => {
    let y = e.date_year_start ?? 1950
    if (e.date_start) {
      const parts = e.date_start.split('-')
      y = +parts[0] + (parts[1] ? (+parts[1] - 1) / 12 : 0)
    }
    return { ...e, year: y, x: 0, side: 'up', depth: 0 }
  })
  events.sort((a, b) => a.year - b.year)

  const byId = new Map(events.map(e => [e.id, e]))
  const connByEvent = new Map<string, ConnRef[]>()
  rawConnections.forEach(c => {
    const push = (id: string, ref: ConnRef) => {
      const list = connByEvent.get(id) ?? []
      list.push(ref)
      connByEvent.set(id, list)
    }
    push(c.from_event_id, { ...c, dir: 'from', otherId: c.to_event_id })
    push(c.to_event_id, { ...c, dir: 'to', otherId: c.from_event_id })
  })

  if (events.length === 0) {
    return {
      events, minY: 1940, maxY: 2030, pxPerYear: 1, byId, connByEvent,
      eraBands: [] as EraBand[], ticks: [] as Tick[],
    }
  }

  const minY = Math.floor(Math.min(...events.map(e => e.year)) / 5) * 5
  const maxY = Math.ceil(Math.max(...events.map(e => e.year)) / 5) * 5
  const pxPerYear = TRACK_W / (maxY - minY)
  events.forEach(e => { e.x = (e.year - minY) * pxPerYear })

  const up: number[] = []
  const down: number[] = []
  events.forEach((e, i) => {
    const side: 'up' | 'down' = i % 2 === 0 ? 'up' : 'down'
    const arr = side === 'up' ? up : down
    let depth = 0
    while (depth < arr.length && depth < MAX_DEPTH && Math.abs(e.x - arr[depth]) < MIN_GAP) depth++
    if (depth > MAX_DEPTH) depth = MAX_DEPTH
    arr[depth] = e.x
    e.side = side
    e.depth = depth
  })

  const eraOrder: Era[] = []
  events.forEach(e => {
    const era = e.era as Era
    if (!eraOrder.includes(era)) eraOrder.push(era)
  })
  const eraBands: EraBand[] = eraOrder.map(era => {
    const es = events.filter(e => e.era === era)
    const minX = Math.min(...es.map(e => e.x)) - 20
    const maxX = Math.max(...es.map(e => e.x)) + 20
    const cfg = ERA_CONFIG[era]
    return { era, leftPx: minX + PAD, widthPx: maxX - minX, color: cfg.color, label: cfg.label.toUpperCase() }
  })

  const ticks: Tick[] = []
  for (let y = minY; y <= maxY; y += 10) {
    ticks.push({ year: y, leftPx: (y - minY) * pxPerYear + PAD })
  }

  return { events, minY, maxY, pxPerYear, byId, connByEvent, eraBands, ticks }
}

// ── Page ───────────────────────────────────────────────────

export default function Timeline() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [sliderEnabled, setSliderEnabled] = useState(true)
  const [sliderYear, setSliderYear] = useState(1990)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [popupPos, setPopupPos] = useState<{ left: number; top: number } | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)

  const { data, isLoading } = useConnections()
  const rawEvents = useMemo(() => data?.events ?? [], [data])
  const rawConnections = useMemo(() => data?.connections ?? [], [data])

  const layout = useMemo(() => computeLayout(rawEvents, rawConnections), [rawEvents, rawConnections])

  // Clamp the scrubber year into the real data range (in case the default of
  // 1990 falls outside it) without a separate render pass.
  const activeYear = Math.min(Math.max(sliderYear, layout.minY), layout.maxY)

  useEffect(() => () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
  }, [])

  function toggleSlider() {
    setSliderEnabled(v => !v)
    setHoverId(null)
  }

  function onSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const yr = +e.target.value
    setSliderYear(yr)
    const x = (yr - layout.minY) * layout.pxPerYear + PAD
    const el = scrollRef.current
    if (el) el.scrollTo({ left: Math.max(0, x - el.clientWidth / 2), behavior: 'smooth' })
  }

  function showHover(id: string, target: HTMLElement) {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    const rect = target.getBoundingClientRect()
    let left = rect.left - 170
    left = Math.max(8, Math.min(left, window.innerWidth - 348))
    let top = rect.bottom + 12
    if (top > window.innerHeight - 300) top = rect.top - 292
    setHoverId(id)
    setPopupPos({ left, top })
  }

  function scheduleHide() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setHoverId(null), 220)
  }

  function cancelHide() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
  }

  function focusEvent(id: string) {
    const e = layout.byId.get(id)
    if (!e) return
    const el = scrollRef.current
    if (el) el.scrollTo({ left: Math.max(0, e.x + PAD - el.clientWidth / 2), behavior: 'smooth' })
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setHoverId(null)
    setFlashId(id)
    setTimeout(() => setFlashId(f => (f === id ? null : f)), 1600)
  }

  const hoveredEvent = hoverId ? layout.byId.get(hoverId) ?? null : null
  const hoveredConns = hoverId ? layout.connByEvent.get(hoverId) ?? [] : []

  return (
    <div className="tl2-root">
      {/* Header */}
      <div className="tl2-header">
        <div className="tl2-title-block">
          <div className="tl2-title">UAP EVENT TIMELINE</div>
          <div className="tl2-subtitle">
            CORPUS TRACKING · {layout.events.length} VERIFIED RECORDS · {rawConnections.length} LINKED CONNECTIONS
          </div>
        </div>

        <div className="tl2-divider" />

        <div className="tl2-scrubber-group">
          <span className="tl2-scrubber-label">TEMPORAL SCRUBBER</span>
          <div
            className="tl2-toggle"
            style={{ background: sliderEnabled ? 'rgba(63,196,255,0.15)' : 'rgba(90,160,255,0.08)' }}
            onClick={toggleSlider}
          >
            <div className="tl2-toggle-thumb" style={{ left: sliderEnabled ? 30 : 2 }} />
          </div>
          <span className="tl2-toggle-state" style={{ color: sliderEnabled ? '#3fc4ff' : '#5a7a9a' }}>
            {sliderEnabled ? 'ON' : 'OFF'}
          </span>
        </div>

        <div className="tl2-divider" />

        {sliderEnabled && (
          <div className="tl2-scrubber-value-row">
            <span className="tl2-year-display">{Math.round(activeYear)}</span>
            <input
              type="range"
              className="tl2-range"
              min={layout.minY}
              max={layout.maxY}
              step={1}
              value={activeYear}
              onChange={onSliderChange}
            />
            <span className="tl2-range-bounds">{layout.minY}—{layout.maxY}</span>
          </div>
        )}
      </div>

      {/* Track */}
      <div className="tl2-scroll" ref={scrollRef}>
        {isLoading ? (
          <div className="tl2-loading">Loading corpus…</div>
        ) : (
          <div className="tl2-track" style={{ width: TRACK_W + PAD * 2 }}>
            {layout.eraBands.map((b, i) => (
              <div
                key={`${b.era}-${i}`}
                className="tl2-era-band"
                style={{
                  left: b.leftPx,
                  width: b.widthPx,
                  background: hexToRgba(b.color, 0.06),
                  borderLeft: `1px solid ${hexToRgba(b.color, 0.25)}`,
                  borderRight: `1px solid ${hexToRgba(b.color, 0.25)}`,
                }}
              >
                <div className="tl2-era-band-label" style={{ color: b.color }}>{b.label}</div>
              </div>
            ))}

            {layout.ticks.map(t => (
              <div key={t.year} className="tl2-tick" style={{ left: t.leftPx }}>
                <div className="tl2-tick-label">{t.year}</div>
              </div>
            ))}

            <div className="tl2-centerline" />

            {sliderEnabled && (
              <div className="tl2-playhead" style={{ left: (activeYear - layout.minY) * layout.pxPerYear + PAD }}>
                <div className="tl2-playhead-dot" />
              </div>
            )}

            {layout.events.map(e => {
              const major = e.tier === 1
              const visible = sliderEnabled ? e.year <= activeYear : major
              const off = 40 + e.depth * LANE
              const dotSize = major ? 15 : e.tier === 2 ? 10 : 7
              const color = ERA_CONFIG[e.era as Era]?.color ?? '#5a7a9a'
              const flashed = flashId === e.id

              return (
                <div
                  key={e.id}
                  className="tl2-node"
                  style={{
                    left: e.x + PAD,
                    opacity: visible ? 1 : 0,
                    pointerEvents: visible ? 'auto' : 'none',
                    zIndex: flashed ? 10 : major ? 3 : 2,
                  }}
                >
                  <div
                    className="tl2-node-dot"
                    style={{
                      width: dotSize,
                      height: dotSize,
                      background: color,
                      boxShadow: flashed
                        ? `0 0 0 8px rgba(63,196,255,0.35), 0 0 18px ${color}`
                        : major ? `0 0 10px ${color}` : 'none',
                      border: major ? '1px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.15)',
                    }}
                    onMouseEnter={major ? ev => showHover(e.id, ev.currentTarget) : undefined}
                    onMouseLeave={major ? scheduleHide : undefined}
                  />
                  <div
                    className="tl2-node-stem"
                    style={{
                      background: hexToRgba(color, major ? 0.55 : 0.3),
                      top: e.side === 'up' ? `calc(50% - ${off}px)` : '50%',
                      height: off,
                    }}
                  />
                  <div
                    className="tl2-node-label"
                    style={{
                      top: e.side === 'up' ? `calc(50% - ${off}px)` : `calc(50% + ${off}px)`,
                      transform: e.side === 'up' ? 'translate(-50%,-100%)' : 'translate(-50%,0%)',
                      width: major ? 168 : 128,
                      borderTop: `1px solid ${color}`,
                      borderBottom: `1px solid ${color}`,
                    }}
                  >
                    <div className="tl2-node-date">{fmtDate(e)}</div>
                    <div
                      className="tl2-node-title"
                      style={{
                        fontSize: major ? '11.5px' : '10px',
                        color: major ? '#e7f3ff' : '#7a93ad',
                        fontWeight: major ? 600 : 400,
                      }}
                    >
                      {e.title}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {hoveredEvent && popupPos && (
          <div
            className="tl2-popup"
            style={{
              left: popupPos.left,
              top: popupPos.top,
              borderColor: ERA_CONFIG[hoveredEvent.era as Era]?.color ?? '#5a7a9a',
            }}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
          >
            <div className="tl2-popup-date">{fmtDate(hoveredEvent)}</div>
            <div className="tl2-popup-title">{hoveredEvent.title}</div>
            <div className="tl2-popup-count">
              {hoveredConns.length} LINKED RECORD{hoveredConns.length === 1 ? '' : 'S'}
            </div>

            {hoveredConns.length === 0 ? (
              <div className="tl2-popup-empty">No linked records</div>
            ) : (
              <ul className="tl2-popup-list">
                {hoveredConns.map((c, i) => {
                  const other = layout.byId.get(c.otherId)
                  const meta = CONNECTION_TYPE_CONFIG[c.connection_type as ConnectionType]
                  return (
                    <li
                      key={i}
                      className="tl2-popup-item"
                      onClick={() => other && focusEvent(other.id)}
                    >
                      <span className="tl2-popup-arrow" style={{ color: meta?.color }}>
                        {c.dir === 'from' ? '→' : '←'}
                      </span>
                      <span className="tl2-popup-type" style={{ color: meta?.color, borderColor: meta?.color }}>
                        {meta?.label}
                      </span>
                      <span className="tl2-popup-item-title">{other ? other.title : '(unpublished)'}</span>
                    </li>
                  )
                })}
              </ul>
            )}

            <Link to={`/event/${hoveredEvent.slug}`} className="tl2-popup-link" onClick={() => setHoverId(null)}>
              View full record →
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="tl2-footer">
        <span className="tl2-footer-label">CONNECTION TYPES</span>
        {(Object.keys(CONNECTION_TYPE_CONFIG) as ConnectionType[]).map(id => {
          const meta = CONNECTION_TYPE_CONFIG[id]
          return (
            <div key={id} className="tl2-legend-item">
              <div className="tl2-legend-dot" style={{ background: meta.color }} />
              <span className="tl2-legend-label">{meta.label.toUpperCase()}</span>
            </div>
          )
        })}
        <div className="tl2-spacer" />
        <span className="tl2-hint">HOVER A MAJOR EVENT FOR CONNECTED RECORDS</span>
      </div>
    </div>
  )
}
