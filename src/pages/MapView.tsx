import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import * as topojson from 'topojson-client'
import './map.css'
import { useEvents } from '@/hooks/useEvents'
import { ERA_CONFIG } from '@/lib/constants'
import { formatDateCompact } from '@/lib/utils'
import type { Event } from '@/lib/types'

// ── Constants ─────────────────────────────────────────────

const CLUSTER_THRESHOLD_DEG = 3.5

// ── Geo helpers ───────────────────────────────────────────

function latLonToXYZ(lat: number, lon: number, r = 1): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return [
    -(Math.sin(phi) * Math.cos(theta)) * r,
    Math.cos(phi) * r,
    Math.sin(phi) * Math.sin(theta) * r,
  ]
}

function haversineDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const torad = (d: number) => (d * Math.PI) / 180
  const dLat = torad(lat2 - lat1)
  const dLon = torad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(torad(lat1)) * Math.cos(torad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * (180 / Math.PI)
}

function eventYear(e: Event): number {
  if (e.date_start) {
    const parts = e.date_start.split('-')
    return +parts[0] + (parts[1] ? (+parts[1] - 1) / 12 : 0)
  }
  return e.date_year_start ?? 1950
}

function stablePhase(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff
  return (h / 0xffff) * Math.PI * 2
}

// ── Clustering ────────────────────────────────────────────

interface ClusterGroup {
  key: string
  events: Event[]
  avgLat: number
  avgLon: number
  isCluster: boolean
}

function clusterEvents(events: Event[], thresholdDeg: number): ClusterGroup[] {
  const n = events.length
  const parent = Array.from({ length: n }, (_, i) => i)
  const find = (x: number): number => {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x] }
    return x
  }
  const union = (a: number, b: number) => {
    const ra = find(a), rb = find(b)
    if (ra !== rb) parent[ra] = rb
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (haversineDeg(events[i].latitude!, events[i].longitude!, events[j].latitude!, events[j].longitude!) < thresholdDeg) {
        union(i, j)
      }
    }
  }
  const groups = new Map<number, Event[]>()
  for (let i = 0; i < n; i++) {
    const r = find(i)
    const list = groups.get(r) ?? []
    list.push(events[i])
    groups.set(r, list)
  }
  return [...groups.values()].map((groupEvents, idx) => ({
    key: `g${idx}_${groupEvents[0].id}`,
    events: groupEvents,
    avgLat: groupEvents.reduce((s, e) => s + e.latitude!, 0) / groupEvents.length,
    avgLon: groupEvents.reduce((s, e) => s + e.longitude!, 0) / groupEvents.length,
    isCluster: groupEvents.length > 1,
  }))
}

// ── Starfield ─────────────────────────────────────────────

// Deterministic PRNG (mulberry32) — a fixed seed keeps star placement
// stable across renders without reaching for the impure Math.random.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildStarPositions(): Float32Array {
  const rand = mulberry32(1337)
  const count = 2200
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const r = 60 + rand() * 40
    const th = rand() * Math.PI * 2
    const ph = Math.acos(2 * rand() - 1)
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th)
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th)
    pos[i * 3 + 2] = r * Math.cos(ph)
  }
  return pos
}

function Starfield() {
  const positions = useMemo(() => buildStarPositions(), [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#8fb3d6" size={0.35} transparent opacity={0.55} />
    </points>
  )
}

// ── Base sphere + graticule ───────────────────────────────

function GlobeSphere() {
  return (
    <mesh>
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhongMaterial color="#0c1c30" emissive="#0a1830" emissiveIntensity={0.35} specular="#2a6a9a" shininess={14} />
    </mesh>
  )
}

function buildGraticuleLines(): THREE.Line[] {
  const material = new THREE.LineBasicMaterial({ color: '#1c3a56', transparent: true, opacity: 0.45, depthWrite: false })
  const lines: THREE.Line[] = []
  ;[-60, -30, 0, 30, 60].forEach(lat => {
    const points: THREE.Vector3[] = []
    for (let lon = 0; lon <= 360; lon += 4) points.push(new THREE.Vector3(...latLonToXYZ(lat, lon - 180, 1.001)))
    lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material))
  })
  for (let lon = 0; lon < 360; lon += 30) {
    const points: THREE.Vector3[] = []
    for (let lat = -90; lat <= 90; lat += 4) points.push(new THREE.Vector3(...latLonToXYZ(lat, lon - 180, 1.001)))
    lines.push(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material))
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
    geomToSegments(f.geometry, linePositions, 1.006)
    geomToSegments(f.geometry, glowPositions, 1.003)
  }
  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
  const glowGeo = new THREE.BufferGeometry()
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPositions, 3))
  return { lineGeo, glowGeo }
}

function Continents() {
  const [geos, setGeos] = useState<ContinentGeos | null>(null)
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(topo => setGeos(buildContinentGeos(topo)))
      .catch(() => {})
  }, [])
  if (!geos) return null
  return (
    <>
      <lineSegments geometry={geos.glowGeo}>
        <lineBasicMaterial color="#2a6ea8" transparent opacity={0.18} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={geos.lineGeo}>
        <lineBasicMaterial color="#5ab4ff" transparent opacity={0.8} depthWrite={false} />
      </lineSegments>
    </>
  )
}

// ── Atmosphere ────────────────────────────────────────────

function Atmosphere() {
  return (
    <>
      <mesh scale={1.03}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#1a5fa8" transparent opacity={0.16} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh scale={1.07}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#0d3a80" transparent opacity={0.09} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh scale={1.13}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#0a2a60" transparent opacity={0.14} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </>
  )
}

// ── Event marker ──────────────────────────────────────────

function GlobeMarker({
  group, revealedIds, onHover, onMove, onLeave, onClick,
}: {
  group: ClusterGroup
  revealedIds: Set<string>
  onHover: (group: ClusterGroup, revealed: Event[], x: number, y: number) => void
  onMove: (group: ClusterGroup, revealed: Event[], x: number, y: number) => void
  onLeave: () => void
  onClick: (group: ClusterGroup, revealed: Event[], x: number, y: number) => void
}) {
  const revealed = useMemo(() => group.events.filter(e => revealedIds.has(e.id)), [group, revealedIds])
  const glowRef = useRef<THREE.Mesh>(null)
  const phase = useMemo(() => stablePhase(group.key), [group.key])

  useFrame(({ clock }) => {
    if (!glowRef.current || group.isCluster) return
    const t = clock.getElapsedTime()
    glowRef.current.scale.setScalar(1.15 + 0.15 * Math.sin(t * 1.5 + phase))
  })

  if (revealed.length === 0) return null

  const pos = latLonToXYZ(group.avgLat, group.avgLon, 1.02)
  const eraColor = group.isCluster ? '#3fc4ff' : ERA_CONFIG[group.events[0].era].color
  const tier = group.events[0].tier
  const coreSize = group.isCluster
    ? 0.015 + Math.min(group.events.length, 10) * 0.0017
    : tier === 1 ? 0.014 : tier === 2 ? 0.01 : 0.007
  const glowSize = coreSize * 2

  function handlePointer(fn: (g: ClusterGroup, r: Event[], x: number, y: number) => void) {
    return (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      fn(group, revealed, e.clientX, e.clientY)
    }
  }

  return (
    <group position={pos}>
      <mesh
        onPointerOver={handlePointer(onHover)}
        onPointerMove={handlePointer(onMove)}
        onPointerOut={e => { e.stopPropagation(); onLeave() }}
        onClick={handlePointer(onClick)}
      >
        <sphereGeometry args={[coreSize, 16, 16]} />
        <meshBasicMaterial color={eraColor} />
      </mesh>

      <mesh ref={glowRef}>
        <sphereGeometry args={[glowSize, 16, 16]} />
        <meshBasicMaterial color={eraColor} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {group.isCluster && (
        <Html position={[0, coreSize * 3.4, 0]} center style={{ pointerEvents: 'none' }}>
          <span className="m2-cluster-count">{revealed.length}</span>
        </Html>
      )}
    </group>
  )
}

// ── Globe rig (rotation-based focus/reset) ────────────────

function GlobeRig({
  clusters, revealedIds, focusRequest, resetNonce, paused, controlsRef, onHoverMarker, onMoveMarker, onLeaveMarker, onClickMarker, onDragStart,
}: {
  clusters: ClusterGroup[]
  revealedIds: Set<string>
  focusRequest: { lat: number; lon: number; id: number } | null
  resetNonce: number
  paused: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef: React.MutableRefObject<any>
  onHoverMarker: (group: ClusterGroup, revealed: Event[], x: number, y: number) => void
  onMoveMarker: (group: ClusterGroup, revealed: Event[], x: number, y: number) => void
  onLeaveMarker: () => void
  onClickMarker: (group: ClusterGroup, revealed: Event[], x: number, y: number) => void
  onDragStart: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const animRef = useRef<{ from: THREE.Quaternion; to: THREE.Quaternion; t: number } | null>(null)
  const { camera } = useThree()

  useEffect(() => {
    if (!focusRequest || !groupRef.current) return
    const targetVec = new THREE.Vector3(...latLonToXYZ(focusRequest.lat, focusRequest.lon, 1)).normalize()
    const endQ = new THREE.Quaternion().setFromUnitVectors(targetVec, new THREE.Vector3(0, 0, 1))
    animRef.current = { from: groupRef.current.quaternion.clone(), to: endQ, t: 0 }
  }, [focusRequest])

  useEffect(() => {
    animRef.current = null
    groupRef.current?.quaternion.identity()
    camera.position.set(0, 0, 2.6)
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetNonce])

  useFrame((_, delta) => {
    const anim = animRef.current
    if (anim && groupRef.current) {
      anim.t = Math.min(1, anim.t + delta / 0.45)
      groupRef.current.quaternion.slerpQuaternions(anim.from, anim.to, anim.t)
      if (anim.t >= 1) animRef.current = null
    }
  })

  return (
    <>
      <ambientLight color="#1a2c44" intensity={1.1} />
      <directionalLight color="#4aa8ff" intensity={0.9} position={[-4, 3, 2]} />
      <Starfield />
      <Atmosphere />
      <group ref={groupRef}>
        <GlobeSphere />
        <Graticule />
        <Continents />
        {clusters.map(c => (
          <GlobeMarker
            key={c.key}
            group={c}
            revealedIds={revealedIds}
            onHover={onHoverMarker}
            onMove={onMoveMarker}
            onLeave={onLeaveMarker}
            onClick={onClickMarker}
          />
        ))}
      </group>
      <OrbitControls
        ref={controlsRef}
        enableZoom enablePan={false}
        minDistance={1.4} maxDistance={5}
        autoRotate={!paused} autoRotateSpeed={0.35}
        rotateSpeed={0.55} zoomSpeed={0.6}
        onStart={onDragStart}
      />
    </>
  )
}

// ── Card / popup state shapes ─────────────────────────────

interface CardData {
  left: number
  top: number
  dateLabel: string
  eraLabel: string
  eraColor: string
  title: string
  summary: string
}

interface PopupItem {
  dateLabel: string
  title: string
  onFocus: () => void
}

interface PopupData {
  left: number
  top: number
  headerLabel: string
  items: PopupItem[]
}

// ── Page ───────────────────────────────────────────────────

export default function MapView() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null)

  const [sliderEnabled, setSliderEnabled] = useState(true)
  const [sliderYear, setSliderYear] = useState(1990)
  const [card, setCard] = useState<CardData | null>(null)
  const [clusterPopup, setClusterPopup] = useState<PopupData | null>(null)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [manualPause, setManualPause] = useState(false)
  const [focusRequest, setFocusRequest] = useState<{ lat: number; lon: number; id: number } | null>(null)
  const [resetNonce, setResetNonce] = useState(0)

  const { data: allEvents = [], isLoading } = useEvents()
  const mappable = useMemo(() => allEvents.filter(e => e.latitude != null && e.longitude != null), [allEvents])

  const clusters = useMemo(() => clusterEvents(mappable, CLUSTER_THRESHOLD_DEG), [mappable])

  const { minYear, maxYear } = useMemo(() => {
    if (mappable.length === 0) return { minYear: 1945, maxYear: 2025 }
    const years = mappable.map(eventYear)
    return {
      minYear: Math.floor(Math.min(...years) / 5) * 5,
      maxYear: Math.ceil(Math.max(...years) / 5) * 5,
    }
  }, [mappable])

  const activeYear = Math.min(Math.max(sliderYear, minYear), maxYear)
  const majorCount = useMemo(() => mappable.filter(e => e.tier === 1).length, [mappable])

  const revealedIds = useMemo(() => {
    const src = sliderEnabled ? mappable.filter(e => eventYear(e) <= activeYear) : mappable.filter(e => e.tier === 1)
    return new Set(src.map(e => e.id))
  }, [mappable, sliderEnabled, activeYear])

  function toggleSlider() {
    setSliderEnabled(v => !v)
    setCard(null)
    setClusterPopup(null)
  }

  function onSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSliderYear(+e.target.value)
  }

  function handleReset() {
    setManualPause(false)
    setResetNonce(n => n + 1)
  }

  function cardFor(e: Event, x: number, y: number): CardData {
    const eraMeta = ERA_CONFIG[e.era]
    const left = Math.max(8, Math.min(x + 16, window.innerWidth - 316))
    const top = Math.max(8, Math.min(y + 16, window.innerHeight - 200))
    return { left, top, dateLabel: formatDateCompact(e), title: e.title, summary: e.summary || '', eraColor: eraMeta.color, eraLabel: eraMeta.label.toUpperCase() }
  }

  function handleHoverMarker(group: ClusterGroup, revealed: Event[], x: number, y: number) {
    if (clusterPopup) return
    setHoveredKey(group.key)
    if (group.isCluster) {
      const left = Math.max(8, Math.min(x + 16, window.innerWidth - 316))
      const top = Math.max(8, Math.min(y + 16, window.innerHeight - 140))
      setCard({ left, top, dateLabel: 'CLUSTER', title: `${revealed.length} EVENTS IN THIS REGION`, summary: 'Click to view the list.', eraColor: '#3fc4ff', eraLabel: '' })
    } else if (revealed[0]) {
      setCard(cardFor(revealed[0], x, y))
    }
  }

  function handleLeaveMarker() {
    setHoveredKey(null)
    setCard(null)
  }

  function focusEvent(e: Event) {
    if (e.latitude == null || e.longitude == null) return
    setFocusRequest({ lat: e.latitude, lon: e.longitude, id: Date.now() })
    setClusterPopup(null)
    setCard(cardFor(e, window.innerWidth / 2 - 150, window.innerHeight / 2))
  }

  function handleClickMarker(group: ClusterGroup, revealed: Event[]) {
    setManualPause(true)
    if (group.isCluster) {
      const evs = [...revealed].sort((a, b) => eventYear(a) - eventYear(b))
      const anchorX = window.innerWidth / 2, anchorY = window.innerHeight / 2
      const left = Math.max(8, Math.min(anchorX - 130, window.innerWidth - 300))
      const top = Math.max(8, Math.min(anchorY + 16, window.innerHeight - 300))
      setCard(null)
      setClusterPopup({
        left, top,
        headerLabel: `${evs.length} EVENTS IN THIS CLUSTER`,
        items: evs.map(e => ({ dateLabel: formatDateCompact(e), title: e.title, onFocus: () => focusEvent(e) })),
      })
    } else if (revealed[0]) {
      setClusterPopup(null)
      focusEvent(revealed[0])
    }
  }

  return (
    <div className="m2-root">
      {/* Header */}
      <div className="m2-header">
        <div className="m2-title-block">
          <div className="m2-title">UAP EVENT MAP</div>
          <div className="m2-subtitle">CORPUS TRACKING · {mappable.length} GEOTAGGED RECORDS · {allEvents.length} IN CORPUS</div>
        </div>

        <div className="m2-divider" />

        <div className="m2-scrubber-group">
          <span className="m2-scrubber-label">TEMPORAL SCRUBBER</span>
          <div
            className="m2-toggle"
            style={{ background: sliderEnabled ? 'rgba(63,196,255,0.15)' : 'rgba(90,160,255,0.08)' }}
            onClick={toggleSlider}
          >
            <div className="m2-toggle-thumb" style={{ left: sliderEnabled ? 30 : 2 }} />
          </div>
          <span className="m2-toggle-state" style={{ color: sliderEnabled ? '#3fc4ff' : '#5a7a9a' }}>
            {sliderEnabled ? 'ON' : 'OFF'}
          </span>
        </div>

        <div className="m2-divider" />

        {sliderEnabled ? (
          <div className="m2-scrubber-value-row">
            <span className="m2-year-display">{Math.round(activeYear)}</span>
            <input
              type="range"
              className="m2-range"
              min={minYear}
              max={maxYear}
              step={1}
              value={activeYear}
              onChange={onSliderChange}
            />
            <span className="m2-range-bounds">{minYear}—{maxYear}</span>
          </div>
        ) : (
          <div className="m2-major-only">SHOWING TIER-1 MAJOR EVENTS ONLY · {majorCount} RECORDS</div>
        )}
      </div>

      {/* Globe viewport */}
      <div className="m2-viewport">
        {isLoading && <div className="m2-loading">Loading corpus…</div>}

        <Canvas
          className="m2-canvas"
          camera={{ position: [0, 0, 2.6], fov: 45, near: 0.1, far: 1000 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: '#05070a', cursor: hoveredKey ? 'pointer' : 'grab' }}
        >
          <GlobeRig
            clusters={clusters}
            revealedIds={revealedIds}
            focusRequest={focusRequest}
            resetNonce={resetNonce}
            paused={manualPause || hoveredKey !== null}
            controlsRef={controlsRef}
            onHoverMarker={handleHoverMarker}
            onMoveMarker={handleHoverMarker}
            onLeaveMarker={handleLeaveMarker}
            onClickMarker={handleClickMarker}
            onDragStart={() => setManualPause(true)}
          />
        </Canvas>

        <div className="m2-status-chip">
          <span>GLOBE · 3D</span>
          <span className="m2-status-sep" />
          <span>DRAG TO ORBIT · SCROLL TO ZOOM</span>
          <button className="m2-reset-btn" onClick={handleReset}>RESET</button>
        </div>

        {card && (
          <div className="m2-card" style={{ left: card.left, top: card.top }}>
            <div className="m2-card-top">
              <span className="m2-card-date">{card.dateLabel}</span>
              {card.eraLabel && <span className="m2-card-era" style={{ color: card.eraColor }}>{card.eraLabel}</span>}
            </div>
            <div className="m2-card-title">{card.title}</div>
            {card.summary && <div className="m2-card-summary">{card.summary}</div>}
          </div>
        )}

        {clusterPopup && (
          <>
            <div className="m2-cluster-popup-overlay" onClick={() => setClusterPopup(null)} />
            <div className="m2-cluster-popup" style={{ left: clusterPopup.left, top: clusterPopup.top }}>
              <div className="m2-cluster-popup-header">{clusterPopup.headerLabel}</div>
              {clusterPopup.items.map((it, i) => (
                <div key={i} className="m2-cluster-popup-item" onClick={it.onFocus}>
                  <div className="m2-cluster-popup-date">{it.dateLabel}</div>
                  <div className="m2-cluster-popup-title">{it.title}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Legend footer */}
      <div className="m2-footer">
        <span className="m2-footer-label">ERA</span>
        {Object.values(ERA_CONFIG).map(e => (
          <div key={e.label} className="m2-legend-item">
            <div className="m2-legend-dot" style={{ background: e.color }} />
            <span className="m2-legend-label">{e.label.toUpperCase()}</span>
          </div>
        ))}
        <div className="m2-spacer" />
        <span className="m2-hint">CLICK CLUSTERS TO EXPAND · HOVER FOR DETAIL</span>
      </div>
    </div>
  )
}
