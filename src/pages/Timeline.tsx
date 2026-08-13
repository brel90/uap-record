import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useConnections } from '@/hooks/useConnections'
import type { RawEvent, RawConnection } from '@/hooks/useConnections'
import { ERA_CONFIG, CONNECTION_TYPE_CONFIG } from '@/lib/constants'
import { formatDateCompact } from '@/lib/utils'
import type { Era, ConnectionType } from '@/lib/types'
import './timeline.css'

// ── Layout constants ──────────────────────────────────────

const TRACK_W = 7600
const PAD = 60
const CLUSTER_PX = 16
const WINDOW_YEARS = 14

const NEUTRAL_LINE = 'rgba(140,170,200,0.35)'

// ── Types ──────────────────────────────────────────────────

interface LayoutEvent extends RawEvent {
  year: number
  x: number
}

interface ConnRef extends RawConnection {
  dir: 'from' | 'to'
  otherId: string
  key: string
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

interface ClusterNode {
  clusterKey: string
  cx: number
  events: LayoutEvent[]
}

// ── Helpers ───────────────────────────────────────────────

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function truncateWords(str: string, max: number): string {
  if (!str || str.length <= max) return str || ''
  const cut = str.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).trim() + '…'
}

// ── Layout computation ───────────────────────────────────

function computeLayout(rawEvents: RawEvent[], rawConnections: RawConnection[]) {
  const events: LayoutEvent[] = rawEvents.map(e => {
    let y = e.date_year_start ?? 1950
    if (e.date_start) {
      const parts = e.date_start.split('-')
      y = +parts[0] + (parts[1] ? (+parts[1] - 1) / 12 : 0)
    }
    return { ...e, year: y, x: 0 }
  })
  events.sort((a, b) => a.year - b.year)

  const byId = new Map(events.map(e => [e.id, e]))
  const connByEvent = new Map<string, ConnRef[]>()
  rawConnections.forEach(c => {
    const key = `${c.from_event_id}|${c.to_event_id}|${c.connection_type}`
    const push = (id: string, ref: ConnRef) => {
      const list = connByEvent.get(id) ?? []
      list.push(ref)
      connByEvent.set(id, list)
    }
    push(c.from_event_id, { ...c, dir: 'from', otherId: c.to_event_id, key })
    push(c.to_event_id, { ...c, dir: 'to', otherId: c.from_event_id, key })
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
  events.forEach(e => { e.x = (e.year - minY) * pxPerYear + PAD })

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
    return { era, leftPx: minX, widthPx: maxX - minX, color: cfg.color, label: cfg.label.toUpperCase() }
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
  const [cardPos, setCardPos] = useState<{ left: number; top: number } | null>(null)
  const [hoverConnKey, setHoverConnKey] = useState<string | null>(null)
  const [clusterOpenKey, setClusterOpenKey] = useState<string | null>(null)
  const [clusterPos, setClusterPos] = useState<{ left: number; top: number } | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)

  const { data, isLoading } = useConnections()
  const rawEvents = useMemo(() => data?.events ?? [], [data])
  const rawConnections = useMemo(() => data?.connections ?? [], [data])

  const layout = useMemo(() => computeLayout(rawEvents, rawConnections), [rawEvents, rawConnections])

  const activeYear = Math.min(Math.max(sliderYear, layout.minY), layout.maxY)
  const majorCount = useMemo(() => layout.events.filter(e => e.tier === 1).length, [layout.events])

  useEffect(() => () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
  }, [])

  function toggleSlider() {
    setSliderEnabled(v => !v)
    setHoverId(null)
    setClusterOpenKey(null)
  }

  function onSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const yr = +e.target.value
    setSliderYear(yr)
    const x = (yr - layout.minY) * layout.pxPerYear + PAD
    const el = scrollRef.current
    if (el) el.scrollTo({ left: Math.max(0, x - el.clientWidth / 2), behavior: 'smooth' })
  }

  function showCard(id: string, target: HTMLElement) {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    const rect = target.getBoundingClientRect()
    let left = rect.left - 160
    left = Math.max(8, Math.min(left, window.innerWidth - 330))
    let top = rect.bottom + 12
    if (top > window.innerHeight - 300) top = Math.max(8, rect.top - 300)
    setHoverId(id)
    setCardPos({ left, top })
    setClusterOpenKey(null)
  }

  function scheduleHide() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => {
      setHoverId(null)
      setHoverConnKey(null)
    }, 220)
  }

  function cancelHide() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
  }

  function toggleCluster(clusterKey: string, target: HTMLElement) {
    if (clusterOpenKey === clusterKey) {
      setClusterOpenKey(null)
      return
    }
    const rect = target.getBoundingClientRect()
    let left = rect.left - 130
    left = Math.max(8, Math.min(left, window.innerWidth - 300))
    let top = rect.bottom + 12
    if (top > window.innerHeight - 300) top = Math.max(8, rect.top - 300)
    setClusterOpenKey(clusterKey)
    setClusterPos({ left, top })
    setHoverId(null)
  }

  function focusEvent(id: string) {
    const e = layout.byId.get(id)
    if (!e) return
    const el = scrollRef.current
    if (el) el.scrollTo({ left: Math.max(0, e.x - el.clientWidth / 2), behavior: 'smooth' })
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setHoverId(null)
    setClusterOpenKey(null)
    setFlashId(id)
    setSliderYear(y => Math.max(y, Math.ceil(e.year)))
    setTimeout(() => setFlashId(f => (f === id ? null : f)), 1600)
  }

  // ── Clustering ────────────────────────────────────────

  const visibleEvents = useMemo(
    () => sliderEnabled ? layout.events.filter(e => e.year <= activeYear) : layout.events.filter(e => e.tier === 1),
    [layout.events, sliderEnabled, activeYear],
  )

  const clusters = useMemo(() => {
    const sorted = [...visibleEvents].sort((a, b) => a.x - b.x)
    const out: LayoutEvent[][] = []
    sorted.forEach(e => {
      const last = out[out.length - 1]
      if (last && (e.x - last[last.length - 1].x) < CLUSTER_PX) last.push(e)
      else out.push([e])
    })
    return out.map((events, idx): ClusterNode => {
      const cx = events.length === 1 ? events[0].x : events.reduce((s, e) => s + e.x, 0) / events.length
      return { clusterKey: `c${idx}_${Math.round(cx)}`, cx, events }
    })
  }, [visibleEvents])

  const displayX = useMemo(() => {
    const m = new Map<string, number>()
    clusters.forEach(c => c.events.forEach(e => m.set(e.id, c.cx)))
    return m
  }, [clusters])

  const hoveredEvent = hoverId ? layout.byId.get(hoverId) ?? null : null
  const hoveredConns = hoverId ? layout.connByEvent.get(hoverId) ?? [] : []
  const openCluster = clusterOpenKey ? clusters.find(c => c.clusterKey === clusterOpenKey) ?? null : null

  const connectorPaths = useMemo(() => {
    if (!hoverId || displayX.get(hoverId) == null) return []
    const x1 = displayX.get(hoverId)!
    return (layout.connByEvent.get(hoverId) ?? []).flatMap((c, i) => {
      const x2 = displayX.get(c.otherId)
      if (x2 == null) return []
      const up = i % 2 === 0
      const cy = up ? 22 : 78
      const highlighted = hoverConnKey === c.key
      const meta = CONNECTION_TYPE_CONFIG[c.connection_type as ConnectionType]
      return [{
        d: `M ${x1} 50 Q ${(x1 + x2) / 2} ${cy} ${x2} 50`,
        color: highlighted ? meta?.color ?? NEUTRAL_LINE : NEUTRAL_LINE,
        width: highlighted ? 2.5 : 1,
        opacity: highlighted ? 0.95 : 0.4,
        key: c.key + i,
      }]
    })
  }, [hoverId, hoverConnKey, displayX, layout.connByEvent])

  const windowLeft = sliderEnabled ? (activeYear - WINDOW_YEARS - layout.minY) * layout.pxPerYear + PAD : 0
  const windowRight = sliderEnabled ? (activeYear - layout.minY) * layout.pxPerYear + PAD : 0

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

        {sliderEnabled ? (
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
        ) : (
          <div className="tl2-major-only">SHOWING TIER-1 MAJOR EVENTS ONLY · {majorCount} RECORDS</div>
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
              <>
                <div className="tl2-playhead" style={{ left: (activeYear - layout.minY) * layout.pxPerYear + PAD }}>
                  <div className="tl2-playhead-dot" />
                </div>
                <div
                  className="tl2-window"
                  style={{
                    left: Math.max(0, windowLeft),
                    width: Math.max(0, windowRight - Math.max(0, windowLeft)),
                  }}
                />
              </>
            )}

            <svg className="tl2-connectors" viewBox={`0 0 ${TRACK_W + PAD * 2} 100`} preserveAspectRatio="none">
              {connectorPaths.map(p => (
                <path key={p.key} d={p.d} stroke={p.color} strokeWidth={p.width} fill="none" opacity={p.opacity} />
              ))}
            </svg>

            {clusters.map(c => {
              const isCluster = c.events.length > 1
              const refYear = Math.max(...c.events.map(e => e.year))
              const inWindow = !sliderEnabled || refYear >= activeYear - WINDOW_YEARS

              if (!isCluster) {
                const e = c.events[0]
                const major = e.tier === 1
                const color = ERA_CONFIG[e.era as Era]?.color ?? '#5a7a9a'
                const size = major ? (inWindow ? 18 : 9) : (inWindow ? 11 : 6)
                const flashed = flashId === e.id
                return (
                  <div
                    key={e.id}
                    className="tl2-node"
                    style={{
                      left: c.cx,
                      width: size,
                      height: size,
                      background: color,
                      border: major ? '1.5px solid rgba(255,255,255,0.55)' : '1px solid rgba(255,255,255,0.18)',
                      boxShadow: flashed
                        ? `0 0 0 8px rgba(63,196,255,0.35), 0 0 18px ${color}`
                        : major && inWindow ? `0 0 8px ${color}` : 'none',
                      opacity: flashed ? 1 : inWindow ? 0.95 : 0.4,
                      zIndex: flashed ? 10 : major ? 3 : 2,
                    }}
                    onMouseEnter={ev => showCard(e.id, ev.currentTarget)}
                    onMouseLeave={scheduleHide}
                    onClick={ev => showCard(e.id, ev.currentTarget)}
                  />
                )
              }

              const count = c.events.length
              const size = 22 + Math.min(count, 12) * 1.8
              return (
                <div
                  key={c.clusterKey}
                  className="tl2-node tl2-node-cluster"
                  style={{
                    left: c.cx,
                    width: size,
                    height: size,
                    border: inWindow ? '1.5px solid rgba(63,196,255,0.6)' : '1px solid rgba(90,160,255,0.32)',
                    boxShadow: inWindow ? '0 0 10px rgba(63,196,255,0.4)' : 'none',
                    opacity: inWindow ? 1 : 0.55,
                    zIndex: 3,
                  }}
                  onClick={ev => toggleCluster(c.clusterKey, ev.currentTarget)}
                >
                  <span className="tl2-node-count">{count}</span>
                </div>
              )
            })}
          </div>
        )}

        {hoveredEvent && cardPos && (
          <div
            className="tl2-card"
            style={{ left: cardPos.left, top: cardPos.top }}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
          >
            <div className="tl2-card-top">
              <span className="tl2-card-date">{formatDateCompact(hoveredEvent)}</span>
              <span className="tl2-card-era" style={{ color: ERA_CONFIG[hoveredEvent.era as Era]?.color }}>
                {ERA_CONFIG[hoveredEvent.era as Era]?.label.toUpperCase()}
              </span>
            </div>
            <div className="tl2-card-title">{hoveredEvent.title}</div>
            {hoveredEvent.summary && <div className="tl2-card-summary">{hoveredEvent.summary}</div>}
            <div className="tl2-card-count">
              {hoveredConns.length} LINKED RECORD{hoveredConns.length === 1 ? '' : 'S'}
            </div>

            {hoveredConns.length === 0 ? (
              <div className="tl2-card-empty">No linked records.</div>
            ) : (
              hoveredConns.map(c => {
                const other = layout.byId.get(c.otherId)
                const meta = CONNECTION_TYPE_CONFIG[c.connection_type as ConnectionType]
                return (
                  <div
                    key={c.key}
                    className="tl2-card-item"
                    onClick={() => other && focusEvent(other.id)}
                    onMouseEnter={() => setHoverConnKey(c.key)}
                    onMouseLeave={() => setHoverConnKey(null)}
                  >
                    <div className="tl2-card-item-top">
                      <div className="tl2-card-item-dot" style={{ background: meta?.color }} />
                      <span className="tl2-card-item-type" style={{ color: meta?.color }}>{meta?.label.toUpperCase()}</span>
                      <span className="tl2-card-item-dir">{c.dir === 'from' ? '→' : '←'}</span>
                    </div>
                    <span className="tl2-card-item-title">{other ? other.title : '(unpublished)'}</span>
                  </div>
                )
              })
            )}

            <Link to={`/event/${hoveredEvent.slug}`} className="tl2-card-link" onClick={() => setHoverId(null)}>
              View full record →
            </Link>
          </div>
        )}

        {openCluster && clusterPos && (
          <div className="tl2-cluster-popup" style={{ left: clusterPos.left, top: clusterPos.top }}>
            <div className="tl2-cluster-popup-header">{openCluster.events.length} EVENTS IN THIS CLUSTER</div>
            {[...openCluster.events].sort((a, b) => a.year - b.year).map(e => (
              <div key={e.id} className="tl2-cluster-popup-item" onClick={() => focusEvent(e.id)}>
                <div className="tl2-cluster-popup-date">{formatDateCompact(e)}</div>
                <div className="tl2-cluster-popup-title">{truncateWords(e.title, 46)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="tl2-footer">
        <span className="tl2-footer-label">CONNECTION TYPES (HIGHLIGHT ON HOVER)</span>
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
        <span className="tl2-hint">CLICK CLUSTERS TO EXPAND · HOVER ANY MARKER FOR DETAIL</span>
      </div>
    </div>
  )
}
