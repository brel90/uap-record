import { useState, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Html } from '@react-three/drei'
import * as THREE from 'three'
import * as topojson from 'topojson-client'
import { Link } from 'react-router-dom'
import './map.css'
import { useEvents } from '@/hooks/useEvents'
import { ERA_CONFIG } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { Event } from '@/lib/types'

// ── DoD-confirmed video embeds (youtube-nocookie, no API key needed) ─────────

const VIDEO_EMBEDS: Record<string, string> = {
  // AARO/DoD official channel — USS Nimitz FLIR1 "Tic Tac"
  'nimitz-tic-tac-incident': 'https://www.youtube-nocookie.com/embed/lvvNd3htWd0',
  // First official USG public release — Gimbal (Jan 2015)
  'gimbal-gofast-videos':    'https://www.youtube-nocookie.com/embed/tf1uLwUTDA0',
  // NewsNation — USS Omaha sphere, Pentagon-confirmed (July 2019)
  'uss-omaha-sphere':        'https://www.youtube-nocookie.com/embed/aPZM3bgTQ7g',
}

// ── Helpers ───────────────────────────────────────────────

function latLonToXYZ(lat: number, lon: number, r = 1): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return [
    -(Math.sin(phi) * Math.cos(theta)) * r,
    Math.cos(phi) * r,
    Math.sin(phi) * Math.sin(theta) * r,
  ]
}

function firstSentence(s: string): string {
  const m = s.match(/^[^.!?]+[.!?]/)
  return m ? m[0] : s.slice(0, 120)
}

function stablePhase(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff
  return (h / 0xffff) * Math.PI * 2
}

function isSensorConfirmed(event: Event): boolean {
  return event.tags?.includes('sensor_confirmed') ?? false
}

// ── Graticule ─────────────────────────────────────────────

function buildGraticuleLines(): THREE.Line[] {
  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color('#0d2d40'),
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  })
  const lines: THREE.Line[] = []
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts: number[] = []
    for (let i = 0; i <= 360; i += 2) {
      const phi = (90 - lat) * (Math.PI / 180)
      const theta = i * (Math.PI / 180)
      pts.push(
        Math.sin(phi) * Math.cos(theta) * 1.001,
        Math.cos(phi) * 1.001,
        Math.sin(phi) * Math.sin(theta) * 1.001,
      )
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    lines.push(new THREE.Line(geo, mat))
  }
  for (let lon = 0; lon < 360; lon += 30) {
    const pts: number[] = []
    for (let i = 0; i <= 180; i += 2) {
      const phi = i * (Math.PI / 180)
      const theta = lon * (Math.PI / 180)
      pts.push(
        Math.sin(phi) * Math.cos(theta) * 1.001,
        Math.cos(phi) * 1.001,
        Math.sin(phi) * Math.sin(theta) * 1.001,
      )
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    lines.push(new THREE.Line(geo, mat))
  }
  return lines
}

function Graticule() {
  const lines = useMemo(() => buildGraticuleLines(), [])
  return <group>{lines.map((ln, i) => <primitive key={i} object={ln} />)}</group>
}

// ── Continent outlines ────────────────────────────────────

function addRings(rings: [number, number][][], out: number[], r: number) {
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      out.push(...latLonToXYZ(ring[i][1], ring[i][0], r))
      out.push(...latLonToXYZ(ring[i + 1][1], ring[i + 1][0], r))
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function geomToSegments(geom: any, out: number[], r: number) {
  if (!geom) return
  if (geom.type === 'Polygon') addRings(geom.coordinates, out, r)
  else if (geom.type === 'MultiPolygon') for (const poly of geom.coordinates) addRings(poly, out, r)
  else if (geom.type === 'GeometryCollection') for (const g of geom.geometries) geomToSegments(g, out, r)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildContinentGeo(topo: any): THREE.BufferGeometry {
  const land = topojson.feature(topo, topo.objects.land) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const positions: number[] = []
  const features = land.features ?? [land]
  for (const f of features) geomToSegments(f.geometry, positions, 1.002)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geo
}

// ── Globe ─────────────────────────────────────────────────

function Globe() {
  const [continentGeo, setContinentGeo] = useState<THREE.BufferGeometry | null>(null)
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(topo => setContinentGeo(buildContinentGeo(topo)))
      .catch(() => {})
  }, [])
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial color="#020d1a" specular="#1a4a6a" shininess={15} />
      </mesh>
      <Graticule />
      {continentGeo && (
        <lineSegments geometry={continentGeo}>
          <lineBasicMaterial color="#2a5a7a" transparent opacity={0.9} depthWrite={false} />
        </lineSegments>
      )}
    </group>
  )
}

// ── Atmosphere ────────────────────────────────────────────

function Atmosphere() {
  return (
    <>
      <mesh scale={1.035}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#1a4488" transparent opacity={0.13} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh scale={1.08}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#0d2a60" transparent opacity={0.08} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh scale={1.15}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#0a2050" transparent opacity={0.18} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </>
  )
}

// ── Event marker ──────────────────────────────────────────

function EventMarker({
  event, isHovered, isSelected, onHover, onClick,
}: {
  event: Event
  isHovered: boolean
  isSelected: boolean
  onHover: (id: string | null) => void
  onClick: (event: Event) => void
}) {
  const eraColor = ERA_CONFIG[event.era].color
  const sensor = isSensorConfirmed(event)
  const pos = useMemo(() => latLonToXYZ(event.latitude!, event.longitude!, 1.02), [event.latitude, event.longitude])
  const glowRef = useRef<THREE.Mesh>(null)
  const phase = useMemo(() => stablePhase(event.id), [event.id])

  const coreSize = event.tier === 1 ? 0.013 : event.tier === 2 ? 0.009 : 0.006
  const glowSize = coreSize * 2
  const hasVideo = event.slug in VIDEO_EMBEDS

  // Core color: sensor confirmed → white; visual only → era color
  const coreColor = isSelected ? '#ffffff' : sensor ? '#ffffff' : eraColor
  const glowOpacity = isSelected ? 0.6 : sensor ? 0.38 : 0.22

  useFrame(({ clock }) => {
    if (!glowRef.current || event.tier > 1) return
    const t = clock.getElapsedTime()
    const s = 1.125 + 0.125 * Math.sin(t * Math.PI + phase)
    glowRef.current.scale.setScalar(s)
  })

  return (
    <group position={pos}>
      {/* Core */}
      <mesh
        onPointerOver={e => { e.stopPropagation(); onHover(event.id) }}
        onPointerOut={e => { e.stopPropagation(); onHover(null) }}
        onClick={e => { e.stopPropagation(); onClick(event) }}
      >
        <sphereGeometry args={[coreSize, 16, 16]} />
        <meshBasicMaterial color={coreColor} />
      </mesh>

      {/* Glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[glowSize, 16, 16]} />
        <meshBasicMaterial
          color={eraColor}
          transparent
          opacity={glowOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Video indicator ring — thin torus for DoD-confirmed video cases */}
      {hasVideo && (
        <mesh>
          <torusGeometry args={[glowSize * 1.55, glowSize * 0.12, 8, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={isSelected ? 0.75 : 0.45}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Hover label */}
      {isHovered && !isSelected && (
        <Html position={[0, coreSize * 4, 0]} style={{ pointerEvents: 'none' }}>
          <div className="globe-label">{event.title}</div>
        </Html>
      )}
    </group>
  )
}

// ── Orbit controls ────────────────────────────────────────

function GlobeControls({ paused }: { paused: boolean }) {
  const [interacting, setInteracting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  return (
    <OrbitControls
      enableZoom enablePan={false}
      minDistance={1.4} maxDistance={5}
      autoRotate={!interacting && !paused} autoRotateSpeed={0.3}
      zoomSpeed={0.6} rotateSpeed={0.55}
      onStart={() => { if (timerRef.current) clearTimeout(timerRef.current); setInteracting(true) }}
      onEnd={() => { timerRef.current = setTimeout(() => setInteracting(false), 2500) }}
    />
  )
}

// ── Scene ─────────────────────────────────────────────────

function Scene({ events, hoveredId, selectedId, onHover, onSelect }: {
  events: Event[]
  hoveredId: string | null
  selectedId: string | null
  onHover: (id: string | null) => void
  onSelect: (event: Event) => void
}) {
  return (
    <>
      <directionalLight position={[-4, 3, 2]} intensity={0.8} color="#4488cc" />
      <ambientLight intensity={0.4} color="#112233" />
      <Stars radius={90} depth={60} count={7000} factor={2} saturation={0} fade speed={0.3} />
      <Stars radius={90} depth={60} count={3000} factor={5} saturation={0} fade speed={0.3} />
      <Globe />
      <Atmosphere />
      {events.map(ev => (
        <EventMarker
          key={ev.id}
          event={ev}
          isHovered={hoveredId === ev.id}
          isSelected={selectedId === ev.id}
          onHover={onHover}
          onClick={onSelect}
        />
      ))}
      <GlobeControls paused={hoveredId !== null || selectedId !== null} />
    </>
  )
}

// ── Visual filter bar ─────────────────────────────────────

type FilterMode = 'all' | 'sensor'

function VisualFilter({ mode, onChange, total, sensorCount }: {
  mode: FilterMode
  onChange: (m: FilterMode) => void
  total: number
  sensorCount: number
}) {
  return (
    <div className="map-vfilter">
      <button
        className={`map-vfilter-btn ${mode === 'all' ? 'active' : ''}`}
        onClick={() => onChange('all')}
      >
        All Visual Evidence
        <span className="map-vfilter-count">{total}</span>
      </button>
      <button
        className={`map-vfilter-btn ${mode === 'sensor' ? 'active' : ''}`}
        onClick={() => onChange('sensor')}
      >
        Sensor Confirmed
        <span className="map-vfilter-count">{sensorCount}</span>
      </button>
    </div>
  )
}

// ── Event detail panel ────────────────────────────────────

function renderMedia(event: Event, eraColor: string) {
  const videoSrc = VIDEO_EMBEDS[event.slug]
  if (videoSrc) {
    return (
      <iframe
        src={videoSrc}
        width="100%"
        style={{ aspectRatio: '16/9', border: 'none', display: 'block' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={event.title}
      />
    )
  }

  const summary = event.summary
    ? event.summary.split('.')[0].trim() + '.'
    : null

  return (
    <div style={{
      background: 'rgba(0,5,20,0.6)',
      border: `1px solid ${eraColor}33`,
      borderLeft: `3px solid ${eraColor}`,
      padding: '16px',
      borderRadius: '4px',
      margin: '0',
    }}>
      {summary && (
        <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
          {summary}
        </p>
      )}
    </div>
  )
}

function EventPanel({ event, onClose }: { event: Event; onClose: () => void }) {
  const era = ERA_CONFIG[event.era]
  const date = formatDate(event)
  const sensor = isSensorConfirmed(event)

  return (
    <div className="globe-panel" style={{ '--era': era.color } as React.CSSProperties}>
      <button className="globe-panel-close" onClick={onClose}>×</button>
      <div className="globe-panel-stripe" />

      {renderMedia(event, era.color)}

      <div className="globe-panel-inner">
        {date && <div className="globe-panel-date">{date}</div>}
        <h2 className="globe-panel-title">{event.title}</h2>
        <div className="globe-panel-badges">
          <span className="globe-panel-era" style={{ color: era.color, borderColor: era.color }}>
            {era.code}
          </span>
          <span className="globe-panel-era-label">{era.label}</span>
          <span className="globe-panel-tier">T{event.tier}</span>
          {sensor && (
            <span className="globe-panel-sensor">SENSOR</span>
          )}
        </div>
        {event.summary && (
          <p className="globe-panel-summary">{firstSentence(event.summary)}</p>
        )}
        <Link to={`/event/${event.slug}`} className="globe-panel-link">
          View full record →
        </Link>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────

export default function MapView() {
  const { data: allEvents = [], isLoading } = useEvents({ tag: 'visual_evidence' })
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const mappable = useMemo(
    () => allEvents.filter(e => e.latitude != null && e.longitude != null),
    [allEvents],
  )

  const sensorEvents = useMemo(
    () => mappable.filter(isSensorConfirmed),
    [mappable],
  )

  const visible = filterMode === 'sensor' ? sensorEvents : mappable

  function handleSelect(ev: Event) {
    setSelectedEvent(prev => prev?.id === ev.id ? null : ev)
  }

  // Clear selection when filter changes and selected event is not visible
  const visibleIds = useMemo(() => new Set(visible.map(e => e.id)), [visible])
  if (selectedEvent && !visibleIds.has(selectedEvent.id)) {
    setSelectedEvent(null)
  }

  return (
    <div className="map-root">
      <div className="tl-topbar">
        <span>Corpus</span>
        <span className="tl-topbar-sep">/</span>
        <span className="tl-topbar-active">Map</span>
        <span className="tl-topbar-sep">/</span>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'IBM Plex Mono', fontSize: 10 }}>
          Visual Evidence
        </span>
        {!isLoading && (
          <>
            <span className="tl-topbar-sep">/</span>
            <span style={{ color: 'rgba(255,255,255,0.18)', fontFamily: 'IBM Plex Mono', fontSize: 10 }}>
              {visible.length} plotted
            </span>
          </>
        )}
      </div>

      <VisualFilter
        mode={filterMode}
        onChange={setFilterMode}
        total={mappable.length}
        sensorCount={sensorEvents.length}
      />

      <div className="map-body">
        <Canvas
          className="map-canvas"
          camera={{ position: [0, 0, 2.6], fov: 45, near: 0.1, far: 1000 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: '#020408' }}
        >
          <Scene
            events={visible}
            hoveredId={hoveredId}
            selectedId={selectedEvent?.id ?? null}
            onHover={setHoveredId}
            onSelect={handleSelect}
          />
        </Canvas>

        {selectedEvent && (
          <>
            {/* Transparent overlay — clicking outside the panel closes it */}
            <div
              style={{ position: 'absolute', inset: 0, zIndex: 99 }}
              onClick={() => setSelectedEvent(null)}
            />
            <EventPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
          </>
        )}
      </div>
    </div>
  )
}
