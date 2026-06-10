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

// ── Touch-device detection (used to suppress hover-only UI) ──
const isTouchDevice =
  typeof window !== 'undefined' &&
  (navigator.maxTouchPoints > 0 || 'ontouchstart' in window)

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

// ── Torn-map image hover overlay ──────────────────────────
//
// Hand-crafted irregular polygon — each edge zig-zags ±8% to mimic a
// paper tear. Points run: top (left→right) → right (top→bottom) →
// bottom (right→left) → left (bottom→top).
const TORN_POLYGON =
  '3% 9%,7% 3%,11% 9%,15% 2%,19% 8%,23% 2%,27% 7%,31% 3%,' +
  '35% 9%,39% 2%,43% 7%,47% 3%,51% 9%,55% 2%,59% 7%,63% 3%,' +
  '67% 9%,71% 2%,75% 8%,79% 3%,83% 9%,87% 3%,91% 8%,95% 2%,98% 7%,' +
  '100% 14%,97% 20%,100% 26%,97% 32%,100% 38%,97% 44%,' +
  '100% 50%,97% 56%,100% 62%,97% 68%,100% 74%,97% 80%,100% 86%,97% 92%,' +
  '94% 98%,90% 94%,86% 98%,82% 94%,78% 99%,74% 94%,70% 98%,' +
  '66% 94%,62% 99%,58% 94%,54% 98%,50% 94%,46% 99%,42% 94%,' +
  '38% 98%,34% 94%,30% 99%,26% 94%,22% 98%,18% 94%,14% 98%,' +
  '10% 94%,6% 98%,2% 93%,' +
  '0% 87%,3% 81%,0% 75%,3% 69%,0% 63%,3% 57%,' +
  '0% 51%,3% 45%,0% 39%,3% 33%,0% 27%,3% 21%,0% 15%'

// Inline SVG noise tile for the film-grain overlay
const GRAIN_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' " +
  "width='180' height='130'%3E%3Cfilter id='n'%3E" +
  "%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='4' " +
  "stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E" +
  "%3C/filter%3E%3Crect width='180' height='130' filter='url(%23n)'/%3E" +
  "%3C/svg%3E\")"

function TornImageHover({ imageUrl, title }: { imageUrl: string; title: string }) {
  // If the image fails to load (404, hotlink block), fall back to the plain
  // label instead of rendering an empty torn frame.
  const [failed, setFailed] = useState(false)
  if (failed) return <div className="globe-label">{title}</div>
  return (
    <div
      style={{
        pointerEvents: 'none',
        transform: 'translate(18px, -50%)',
        // drop-shadow bleeds outside the clip boundary → dark halo around the
        // jagged edges, creating the illusion of depth through a tear.
        filter:
          'drop-shadow(0 0 22px rgba(0,0,0,0.99)) ' +
          'drop-shadow(0 0 7px rgba(0,0,0,0.88))',
      }}
    >
      {/* Torn-edge clipping container */}
      <div
        style={{
          width: 234,
          height: 158,
          clipPath: `polygon(${TORN_POLYGON})`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Archival image treatment: desaturated, slightly dark, faint warm tone */}
        <img
          src={imageUrl}
          alt={title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            filter: 'grayscale(42%) brightness(0.8) contrast(1.08) sepia(10%)',
          }}
          onError={() => setFailed(true)}
        />

        {/* Vignette — transparent center, dark near torn edges */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 60% 55% at 50% 50%, ' +
              'transparent 25%, rgba(0,0,0,0.62) 100%)',
          }}
        />

        {/* Film grain overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: GRAIN_BG,
            backgroundSize: 'cover',
            opacity: 0.1,
            mixBlendMode: 'overlay',
          }}
        />
      </div>
    </div>
  )
}

// ── Graticule ─────────────────────────────────────────────

function buildGraticuleLines(): THREE.Line[] {
  const material = new THREE.LineBasicMaterial({
    color: '#1a3a5a',
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  })
  const lines: THREE.Line[] = []

  // Latitude lines every 15 degrees
  ;[-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75].forEach(lat => {
    const points: THREE.Vector3[] = []
    for (let lon = 0; lon <= 360; lon += 2) {
      const phi = (90 - lat) * (Math.PI / 180)
      const theta = lon * (Math.PI / 180)
      points.push(new THREE.Vector3(
        -1.001 * Math.sin(phi) * Math.cos(theta),
        1.001 * Math.cos(phi),
        1.001 * Math.sin(phi) * Math.sin(theta),
      ))
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    lines.push(new THREE.Line(geometry, material))
  })

  // Longitude lines every 15 degrees
  for (let lon = 0; lon < 360; lon += 15) {
    const points: THREE.Vector3[] = []
    for (let lat = -90; lat <= 90; lat += 2) {
      const phi = (90 - lat) * (Math.PI / 180)
      const theta = lon * (Math.PI / 180)
      points.push(new THREE.Vector3(
        -1.001 * Math.sin(phi) * Math.cos(theta),
        1.001 * Math.cos(phi),
        1.001 * Math.sin(phi) * Math.sin(theta),
      ))
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    lines.push(new THREE.Line(geometry, material))
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

interface ContinentGeos {
  lineGeo: THREE.BufferGeometry
  glowGeo: THREE.BufferGeometry
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildContinentGeos(topo: any): ContinentGeos {
  const land = topojson.feature(topo, topo.objects.land) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const linePositions: number[] = []
  const glowPositions: number[] = []
  const features = land.features ?? [land]
  for (const f of features) {
    geomToSegments(f.geometry, linePositions, 1.006) // continent lines — lifted above glow
    geomToSegments(f.geometry, glowPositions, 1.003) // glow layer — between graticule and lines
  }
  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
  const glowGeo = new THREE.BufferGeometry()
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPositions, 3))
  return { lineGeo, glowGeo }
}

// ── Globe ─────────────────────────────────────────────────

function Globe() {
  const [continentGeos, setContinentGeos] = useState<ContinentGeos | null>(null)
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(topo => setContinentGeos(buildContinentGeos(topo)))
      .catch(() => {})
  }, [])
  return (
    <group>
      {/* Layer 1 — globe sphere (r=1.0) */}
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial color="#112244" emissive="#112244" emissiveIntensity={0.25} specular="#2a6a9a" shininess={12} />
      </mesh>
      {/* Layer 2 — graticule grid lines (r=1.001) */}
      <Graticule />
      {continentGeos && (
        <>
          {/* Layer 3 — continent glow (r=1.003): faint blue halo beneath outlines */}
          <lineSegments geometry={continentGeos.glowGeo}>
            <lineBasicMaterial color="#1a4a7a" transparent opacity={0.15} linewidth={2} depthWrite={false} />
          </lineSegments>
          {/* Layer 4 — continent outlines (r=1.006): lifted above glow for floating effect */}
          <lineSegments geometry={continentGeos.lineGeo}>
            <lineBasicMaterial color="#2a5a7a" transparent opacity={0.9} depthWrite={false} />
          </lineSegments>
        </>
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

      {/* Hover UI — torn image overlay on desktop when image_url present,
           plain label otherwise. Mobile tap keeps its existing EventPanel. */}
      {isHovered && !isSelected && (
        <Html position={[0, coreSize * 4, 0]} style={{ pointerEvents: 'none' }}>
          {event.image_url && !isTouchDevice ? (
            <TornImageHover imageUrl={event.image_url} title={event.title} />
          ) : (
            <div className="globe-label">{event.title}</div>
          )}
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
