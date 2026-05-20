import { useState, useMemo, useRef, useEffect } from 'react'
import ForceGraph3D from '3d-force-graph'
import * as THREE from 'three'
import { Link } from 'react-router-dom'
import { useConnections } from '@/hooks/useConnections'
import type { RawEvent, RawConnection } from '@/hooks/useConnections'
import { ERA_CONFIG, CONNECTION_TYPE_CONFIG } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { ConnectionType, Era } from '@/lib/types'
import './graph.css'

// ── Types ──────────────────────────────────────────────────

interface GNode {
  id: string
  name: string
  era: Era
  tier: number
  slug: string
  summary: string | null
  date_start: string | null
  date_year_start: number | null
}

interface GLink {
  source: string | GNode
  target: string | GNode
  type: ConnectionType
  strength: number | null
  description: string | null
}

// ── Helpers ───────────────────────────────────────────────


// ── Custom node mesh (stable — defined outside component) ─

// Step 3: era colors hardcoded directly — no module caching risk
const ERA_NODE_COLORS: Record<string, string> = {
  disclosure:     '#0d6e4a',
  modern_revival: '#6e3d0d',
  post_condon:    '#3d1a6e',
  blue_book:      '#1a1a6e',
  early_cold_war: '#0d5c8a',
  pre_modern:     '#1a3a5c',
}

function makeNodeObject(node: object): THREE.Group {
  const n = node as GNode
  // Step 1: confirm this is being called
  console.log('nodeThreeObject called', n.name)

  const size = n.tier === 1 ? 3.5 : n.tier === 2 ? 2 : 1
  const hexColor = ERA_NODE_COLORS[n.era] ?? '#1a3a5c'
  const color = new THREE.Color(hexColor)
  const group = new THREE.Group()

  // Inner bright core
  const coreGeo = new THREE.SphereGeometry(size * 0.4, 16, 16)
  const coreMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: n.tier === 1 ? 0.9 : 0.6,
  })
  group.add(new THREE.Mesh(coreGeo, coreMat))

  // Outer glow sphere
  const glowGeo = new THREE.SphereGeometry(size, 16, 16)
  const glowMat = new THREE.MeshLambertMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: n.tier === 1 ? 0.5 : 0.25,
  })
  group.add(new THREE.Mesh(glowGeo, glowMat))

  return group
}

// ── Filter constants ──────────────────────────────────────

const CONN_TYPES: { id: ConnectionType; label: string }[] = [
  { id: 'causal',        label: 'Causal'        },
  { id: 'institutional', label: 'Institutional' },
  { id: 'thematic',      label: 'Thematic'      },
  { id: 'investigative', label: 'Investigative' },
  { id: 'legislative',   label: 'Legislative'   },
  { id: 'personnel',     label: 'Personnel'     },
  { id: 'suppression',   label: 'Suppression'   },
  { id: 'debunking',     label: 'Debunking'     },
]

// ── Filter panel ──────────────────────────────────────────

interface FilterPanelProps {
  activeTypes: Set<ConnectionType>
  toggleType: (id: ConnectionType) => void
  showSubs: boolean
  setShowSubs: (v: boolean) => void
  open: boolean
  setOpen: (v: boolean) => void
}

function FilterPanel({ activeTypes, toggleType, showSubs, setShowSubs, open, setOpen }: FilterPanelProps) {
  return (
    <div className="gfloat">
      <button className="gfloat-toggle" onClick={() => setOpen(!open)}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="3" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.1"/>
          <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.1"/>
          <circle cx="11" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.1"/>
          <line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        </svg>
        <span>Filters</span>
        <span className="gfloat-toggle-count">{activeTypes.size}/{CONN_TYPES.length}</span>
      </button>

      {open && (
        <div className="gfloat-body">
          <div className="gp-section">
            <div className="gp-title">
              <span className="gp-title-code">01</span>
              <span>Connection type</span>
            </div>
            <ul className="ct-list">
              {CONN_TYPES.map(t => {
                const on = activeTypes.has(t.id)
                const color = CONNECTION_TYPE_CONFIG[t.id].color
                return (
                  <li key={t.id}
                    className={`ct-row ${on ? 'is-on' : 'is-off'}`}
                    onClick={() => toggleType(t.id)}>
                    <span className="ct-dot" style={{ background: color, opacity: on ? 1 : 0.2 }} />
                    <span className="ct-label">{t.label}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="gp-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <div className="gp-title">
              <span className="gp-title-code">02</span>
              <span>Nodes</span>
            </div>
            <label className="gp-toggle">
              <input type="checkbox" checked={showSubs} onChange={e => setShowSubs(e.target.checked)} />
              <span className="gp-toggle-track"><span className="gp-toggle-thumb" /></span>
              <span className="gp-toggle-label">Show sub-events</span>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Node detail sheet ─────────────────────────────────────

interface SheetProps {
  node: GNode | null
  allConnections: RawConnection[]
  nodeMap: Map<string, GNode>
  onClose: () => void
}

function NodeSheet({ node, allConnections, nodeMap, onClose }: SheetProps) {
  if (!node) return null

  const era = ERA_CONFIG[node.era]
  const date = formatDate(node)

  const conns = allConnections
    .filter(c => c.from_event_id === node.id || c.to_event_id === node.id)
    .map(c => {
      const dir = c.from_event_id === node.id ? 'out' : 'in'
      const otherId = dir === 'out' ? c.to_event_id : c.from_event_id
      const other = nodeMap.get(otherId)
      return { c, dir, other }
    })
    .filter(x => x.other)

  return (
    <>
      <div className="gsheet-overlay" onClick={onClose} />
      <aside className="gsheet"
        style={{ '--era': era?.color, '--era-tint': era?.tint } as React.CSSProperties}>
        <div className="gsheet-head">
          <div className="gsheet-head-l">
            <span className="gsheet-eyebrow">EVENT</span>
            <span className="gsheet-slug">{node.slug}</span>
          </div>
          <button className="gpr-close" onClick={onClose}>×</button>
        </div>

        <div className="gpr-stripe" />

        <div className="gsheet-body">
          <div className="gpr-badges">
            <span className="gpr-badge gpr-badge-era"
              style={{ color: era?.color, borderColor: era?.color, background: era?.tint }}>
              <span className="gpr-badge-dot" style={{ background: era?.color }} />
              {era?.label}
            </span>
            <span className="gpr-badge">Tier {node.tier}</span>
            {date && <span className="gpr-badge gpr-badge-tag">{date}</span>}
          </div>

          <h2 className="gpr-title">{node.name}</h2>

          {node.summary && (
            <p className="gpr-summary">
              {node.summary.slice(0, 250)}{node.summary.length > 250 ? '…' : ''}
            </p>
          )}

          {conns.length > 0 && (
            <div className="gpr-sec">
              <div className="gpr-sec-head">
                <span>Connections</span>
                <span className="gpr-sec-count">{conns.length}</span>
              </div>
              <ul className="gpr-conn-list">
                {conns.map(({ c, dir, other }, i) => {
                  const ct = CONNECTION_TYPE_CONFIG[c.connection_type as ConnectionType]
                  if (!ct || !other) return null
                  const strength = c.strength ?? 2
                  return (
                    <li key={i}>
                      <Link to={`/event/${other.slug}`} className="gpr-conn" onClick={onClose}>
                        <div className="gpr-conn-head">
                          <span className="gpr-conn-arrow" style={{ color: ct.color }}>
                            {dir === 'out' ? '→' : '←'}
                          </span>
                          <span className="gpr-conn-type"
                            style={{ color: ct.color, borderColor: ct.color }}>
                            {ct.label}
                          </span>
                          <span className="gpr-strength">
                            {[0, 1, 2].map(j => (
                              <span key={j}
                                className={`gpr-strength-dot${j < strength ? ' is-on' : ''}`}
                                style={j < strength ? { background: ct.color } : undefined}
                              />
                            ))}
                          </span>
                        </div>
                        <div className="gpr-conn-title">{other.name}</div>
                        {c.description && <div className="gpr-conn-desc">{c.description}</div>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div className="gpr-actions">
            <Link to={`/event/${node.slug}`} className="gpr-btn gpr-btn-primary" onClick={onClose}>
              View full record →
            </Link>
          </div>
        </div>
      </aside>
    </>
  )
}

// ── Page ───────────────────────────────────────────────────

export default function Graph() {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null)

  const [selectedNode, setSelectedNode] = useState<GNode | null>(null)
  const [activeTypes, setActiveTypes] = useState<Set<ConnectionType>>(
    new Set(CONN_TYPES.map(t => t.id))
  )
  const [showSubs, setShowSubs] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)

  const { data, isLoading } = useConnections()
  const allEvents: RawEvent[] = data?.events ?? []
  const allConnections: RawConnection[] = data?.connections ?? []

  const events = useMemo(
    () => showSubs ? allEvents : allEvents.filter(e => !e.parent_event_id),
    [allEvents, showSubs]
  )

  const visibleIds = useMemo(() => new Set(events.map(e => e.id)), [events])

  const { graphData, nodeMap } = useMemo(() => {
    const nodes: GNode[] = events.map(e => ({
      id: e.id,
      name: e.title,
      era: e.era as Era,
      tier: e.tier,
      slug: e.slug,
      summary: e.summary,
      date_start: e.date_start,
      date_year_start: e.date_year_start,
    }))

    const links = allConnections
      .filter(c => activeTypes.has(c.connection_type as ConnectionType))
      .filter(c => visibleIds.has(c.from_event_id) && visibleIds.has(c.to_event_id))
      .map(c => ({
        source: c.from_event_id,
        target: c.to_event_id,
        type: c.connection_type as ConnectionType,
        strength: c.strength,
        description: c.description,
      }))

    const map = new Map(nodes.map(n => [n.id, n]))
    return { graphData: { nodes, links }, nodeMap: map }
  }, [events, allConnections, activeTypes, visibleIds])

  // ── Instantiate 3D graph once — after data is ready ──────
  // [isLoading] dep intentionally avoids StrictMode double-mount:
  // the graph is only created when isLoading flips false, after the
  // StrictMode mount/unmount cycle has already completed.
  useEffect(() => {
    if (!containerRef.current || graphRef.current || isLoading) return

    const el = containerRef.current
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Graph = (ForceGraph3D as any)()(el)
      .backgroundColor('#000008')
      .nodeVal((node: object) => {
        const tier = (node as GNode).tier
        return tier === 1 ? 3.5 : tier === 2 ? 2 : 1
      })
      .nodeThreeObject(makeNodeObject)
      .nodeThreeObjectExtend(false)
      .nodeLabel((node: object) => (node as GNode).name)
      .linkColor((link: object) =>
        CONNECTION_TYPE_CONFIG[(link as GLink).type]?.color ?? '#1a2a3a'
      )
      .linkOpacity(0.4)
      .linkWidth((link: object) => {
        const l = link as GLink
        if (l.type === 'thematic') return 0.3
        if (l.type === 'causal' || l.type === 'suppression') {
          return l.strength === 3 ? 1.0 : l.strength === 2 ? 0.6 : 0.4
        }
        return l.strength === 3 ? 0.6 : l.strength === 2 ? 0.4 : 0.2
      })
      .linkDirectionalArrowLength(3)
      .linkDirectionalArrowRelPos(1)
      .linkDirectionalParticles(2)
      .linkDirectionalParticleWidth(1.5)
      .linkDirectionalParticleSpeed(0.003)
      .linkDirectionalParticleColor((link: object) =>
        CONNECTION_TYPE_CONFIG[(link as GLink).type]?.color ?? '#3399ff'
      )
      .onNodeClick((node: object) => setSelectedNode(node as GNode))
      .onNodeHover((node: object | null) => {
        el.style.cursor = node ? 'pointer' : 'default'
      })
      .graphData(graphData)

    Graph.d3Force('z', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Graph.graphData().nodes.forEach((n: any) => { n.vz += (Math.random() - 0.5) * 0.1 })
    })

    // Hide nav hint text — fallback in case showNavInfo isn't available in this build
    setTimeout(() => {
      el.querySelectorAll('div').forEach(d => {
        if (d.textContent?.includes('Left-click: rotate')) {
          d.style.display = 'none'
        }
      })
    }, 500)

    // Lighting
    const scene = Graph.scene()
    scene.add(new THREE.AmbientLight('#050515', 3))
    const dirLight = new THREE.DirectionalLight('#2244ff', 2)
    dirLight.position.set(200, 200, 200)
    scene.add(dirLight)
    const ptLight1 = new THREE.PointLight('#0033cc', 3, 500)
    ptLight1.position.set(-200, 0, -200)
    scene.add(ptLight1)
    const ptLight2 = new THREE.PointLight('#ff2200', 1, 300)
    ptLight2.position.set(0, -200, 100)
    scene.add(ptLight2)

    // Star field
    const starGeo = new THREE.BufferGeometry()
    const starPositions = new Float32Array(2000 * 3)
    for (let i = 0; i < starPositions.length; i++) {
      starPositions[i] = (Math.random() - 0.5) * 2000
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: '#ffffff', size: 0.4, transparent: true, opacity: 0.35,
    })))

    Graph.width(el.offsetWidth).height(el.offsetHeight)

    const ro = new ResizeObserver(() => {
      if (graphRef.current && el) {
        graphRef.current.width(el.offsetWidth).height(el.offsetHeight)
      }
    })
    ro.observe(el)

    graphRef.current = Graph

    return () => {
      ro.disconnect()
      Graph._destructor?.()
      graphRef.current = null
    }
  }, [isLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Push updated data when filters change ─────────────────
  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.graphData(graphData)
    }
  }, [graphData])

  function toggleType(id: ConnectionType) {
    setActiveTypes(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="tl-root">
      <div className="tl-topbar">
        <span>Corpus</span>
        <span className="tl-topbar-sep">/</span>
        <span>Graph</span>
        <span className="tl-topbar-sep">/</span>
        <span className="tl-topbar-active">Network · 3D</span>
      </div>

      <div className="graph-canvas-wrap" ref={containerRef}>
        <FilterPanel
          activeTypes={activeTypes}
          toggleType={toggleType}
          showSubs={showSubs}
          setShowSubs={setShowSubs}
          open={filterOpen}
          setOpen={setFilterOpen}
        />

        {isLoading && <div className="graph-loading">Loading graph…</div>}

        <NodeSheet
          node={selectedNode}
          allConnections={allConnections}
          nodeMap={nodeMap}
          onClose={() => setSelectedNode(null)}
        />
      </div>
    </div>
  )
}
