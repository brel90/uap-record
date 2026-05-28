import { useParams, useNavigate, Link } from 'react-router-dom'
import { ExternalLink, ArrowLeft } from 'lucide-react'
import './event-detail.css'
import { useEvent } from '@/hooks/useEvent'
import { useEventConnections } from '@/hooks/useEventConnections'
import { ERA_CONFIG, CONNECTION_TYPE_CONFIG } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { Source, EventEntity, EntityType } from '@/lib/types'
import type { ConnectionWithEvent } from '@/hooks/useEventConnections'

const ENTITY_GROUP_ORDER: { key: EntityType; label: string }[] = [
  { key: 'person', label: 'People' },
  { key: 'organization', label: 'Organizations' },
  { key: 'program', label: 'Programs' },
  { key: 'location', label: 'Locations' },
  { key: 'document', label: 'Documents' },
]


// ── Tier dot ───────────────────────────────────────────────
function TierDot({ tier, eraColor }: { tier: number; eraColor: string }) {
  const variant = tier === 1 ? 'filled' : tier === 2 ? 'outlined' : 'faint'
  return (
    <span
      className={`ed-tier-dot ed-tier-dot--${variant}`}
      style={{ '--era': eraColor } as React.CSSProperties}
    />
  )
}

// ── Entity icon ────────────────────────────────────────────
function EntIcon({ type }: { type: EntityType }) {
  const p = { width: 13, height: 13, viewBox: '0 0 14 14', fill: 'none' } as const
  switch (type) {
    case 'person':
      return <svg {...p}><circle cx="7" cy="5" r="2.3" stroke="currentColor" strokeWidth="1.1"/><path d="M2.5 12c0-2.5 2-4.2 4.5-4.2s4.5 1.7 4.5 4.2" stroke="currentColor" strokeWidth="1.1"/></svg>
    case 'organization':
      return <svg {...p}><rect x="2" y="3" width="10" height="9" stroke="currentColor" strokeWidth="1.1"/><line x1="2" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1.1"/><line x1="7" y1="6" x2="7" y2="12" stroke="currentColor" strokeWidth="1.1"/></svg>
    case 'program':
      return <svg {...p}><rect x="2" y="2.5" width="10" height="9" rx="0.5" stroke="currentColor" strokeWidth="1.1"/><line x1="4" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.1"/><line x1="4" y1="7" x2="10" y2="7" stroke="currentColor" strokeWidth="1.1"/><line x1="4" y1="9" x2="8" y2="9" stroke="currentColor" strokeWidth="1.1"/></svg>
    case 'location':
      return <svg {...p}><path d="M7 1.5c-2.5 0-4 2-4 4 0 3 4 7 4 7s4-4 4-7c0-2-1.5-4-4-4z" stroke="currentColor" strokeWidth="1.1"/><circle cx="7" cy="5.5" r="1.3" stroke="currentColor" strokeWidth="1.1"/></svg>
    case 'document':
      return <svg {...p}><path d="M3 1.5h6l3 3v8H3z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/><path d="M9 1.5v3h3" stroke="currentColor" strokeWidth="1.1"/><line x1="5" y1="7" x2="10" y2="7" stroke="currentColor" strokeWidth="1.1"/><line x1="5" y1="9" x2="10" y2="9" stroke="currentColor" strokeWidth="1.1"/></svg>
    default: return null
  }
}

// ── Sources card ───────────────────────────────────────────
function SourcesCard({ sources }: { sources: Source[] }) {
  const grouped: Record<number, Source[]> = {}
  sources.forEach(s => {
    if (!grouped[s.tier]) grouped[s.tier] = []
    grouped[s.tier].push(s)
  })
  const total = sources.length

  return (
    <section className="ed-card">
      <div className="ed-card-head">
        <div className="ed-card-head-l">
          <h3 className="ed-card-title">Sources</h3>
          {total > 0 && <span className="ed-card-count">{total}</span>}
        </div>
        <span className="ed-card-hint">by tier</span>
      </div>
      <div className="ed-card-body">
        {total === 0 && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>No sources recorded.</p>}
        {[1, 2, 3].map(tier => {
          const list = grouped[tier] ?? []
          if (list.length === 0) return null
          return (
            <div key={tier} className="src-group">
              <div className="src-tier-label">
                <span>Tier {tier}</span>
                <span className="src-tier-n">· {list.length}</span>
              </div>
              <ul className="src-list">
                {list.map(s => (
                  <li key={s.id} className="src-row">
                    {s.url ? (
                      <a className="src-link" href={s.url} target="_blank" rel="noreferrer">
                        <span>{s.label}</span>
                        <ExternalLink size={11} className="src-link-icon" />
                      </a>
                    ) : (
                      <div className="src-link" style={{ cursor: 'default' }}>
                        <span>{s.label}</span>
                      </div>
                    )}
                    <div className="src-meta">
                      {s.authors && <span>{s.authors.join(', ')}</span>}
                      {s.authors && s.publication_year && <span className="src-sep">·</span>}
                      {s.publication_year && <span>{s.publication_year}</span>}
                      {s.notes && <><span className="src-sep">·</span><span>{s.notes}</span></>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Entities card ──────────────────────────────────────────
function EntitiesCard({ eventEntities }: { eventEntities: EventEntity[] }) {
  const grouped: Partial<Record<EntityType, EventEntity[]>> = {}
  eventEntities.forEach(ee => {
    if (!ee.entity) return
    const t = ee.entity.type
    if (!grouped[t]) grouped[t] = []
    grouped[t]!.push(ee)
  })
  const total = eventEntities.filter(ee => ee.entity).length

  return (
    <section className="ed-card">
      <div className="ed-card-head">
        <div className="ed-card-head-l">
          <h3 className="ed-card-title">Entities</h3>
          {total > 0 && <span className="ed-card-count">{total}</span>}
        </div>
        <span className="ed-card-hint">by type</span>
      </div>
      <div className="ed-card-body">
        {total === 0 && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>No entities linked.</p>}
        {ENTITY_GROUP_ORDER.map(({ key, label }) => {
          const list = grouped[key] ?? []
          if (list.length === 0) return null
          return (
            <div key={key} className="ent-group">
              <div className="ent-group-label">
                <EntIcon type={key} />
                <span>{label}</span>
                <span className="ent-group-n">· {list.length}</span>
              </div>
              <ul className="ent-list">
                {list.map(ee => (
                  <li key={ee.id} className="ent-row">
                    <Link to={`/entity/${ee.entity!.id}`} className="ent-row-name">
                      {ee.entity!.name}
                      <span className="ent-row-name-arrow">↗</span>
                    </Link>
                    {ee.role && <div className="ent-row-role">{ee.role}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Connections card ───────────────────────────────────────
function ConnectionRow({ conn }: { conn: ConnectionWithEvent }) {
  const typeCfg = CONNECTION_TYPE_CONFIG[conn.type] ?? { label: conn.type, color: 'rgba(255,255,255,0.3)' }
  const strength = conn.strength ?? 0
  const navigate = useNavigate()

  return (
    <div
      className="conn-row"
      onClick={() => conn.related_event && navigate(`/event/${conn.related_event.slug}`)}
      style={{ cursor: conn.related_event ? 'pointer' : 'default' }}
    >
      <div className="conn-row-head">
        <span
          className="conn-type-badge"
          style={{ color: typeCfg.color, borderColor: typeCfg.color }}
        >
          {typeCfg.label}
        </span>
        <span className="conn-strength">
          {[0, 1, 2].map(i => (
            <span key={i} className={`conn-strength-dot${i < strength ? ' is-on' : ''}`} />
          ))}
        </span>
      </div>
      <div className="conn-title">
        {conn.related_event?.title ?? 'Unknown event'}
      </div>
      {conn.description && <div className="conn-desc">{conn.description}</div>}
    </div>
  )
}

function ConnectionsCard({ connections }: { connections: ConnectionWithEvent[] }) {
  const leadsTo = connections.filter(c => c.direction === 'leads_to')
  const connectedFrom = connections.filter(c => c.direction === 'connected_from')

  return (
    <section className="ed-card">
      <div className="ed-card-head">
        <div className="ed-card-head-l">
          <h3 className="ed-card-title">Connections</h3>
          {connections.length > 0 && <span className="ed-card-count">{connections.length}</span>}
        </div>
        <span className="ed-card-hint">causal · thematic</span>
      </div>
      <div className="ed-card-body">
        {connections.length === 0 && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>No connections recorded.</p>
        )}
        {leadsTo.length > 0 && (
          <div className="conn-group">
            <div className="conn-group-head">
              <span className="conn-group-arrow">↳</span>
              <span>Leads to</span>
              <span className="conn-group-n">{leadsTo.length}</span>
            </div>
            <div className="conn-list">
              {leadsTo.map(c => <ConnectionRow key={c.id} conn={c} />)}
            </div>
          </div>
        )}
        {connectedFrom.length > 0 && (
          <div className="conn-group">
            <div className="conn-group-head">
              <span className="conn-group-arrow conn-group-arrow-rev">↰</span>
              <span>Connected from</span>
              <span className="conn-group-n">{connectedFrom.length}</span>
            </div>
            <div className="conn-list">
              {connectedFrom.map(c => <ConnectionRow key={c.id} conn={c} />)}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Page ───────────────────────────────────────────────────
export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { data: event, isLoading, error } = useEvent(slug)
  const { data: connections = [] } = useEventConnections(event?.id)

  if (isLoading) {
    return (
      <div className="tl-root">
        <div className="tl-topbar">
          <span>Corpus</span>
          <span className="tl-topbar-sep">/</span>
          <span>Timeline</span>
        </div>
        <div className="ed-loading">Loading…</div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="tl-root">
        <div className="tl-topbar">
          <span>Corpus</span>
          <span className="tl-topbar-sep">/</span>
          <span>Timeline</span>
        </div>
        <div className="ed-loading">Event not found.</div>
      </div>
    )
  }

  const era = ERA_CONFIG[event.era]
  const date = formatDate(event)
  const tierVariant = event.tier === 1 ? 'filled' : event.tier === 2 ? 'outlined' : 'faint'

  const kvItems = [
    { k: 'ERA', v: era.label },
    { k: 'TIER', v: `Tier ${event.tier}` },
    ...(event.wave ? [{ k: 'WAVE', v: `Wave ${event.wave}` }] : []),
    ...(event.location ? [{ k: 'LOCATION', v: event.location }] : []),
    ...(event.date_precision ? [{ k: 'PRECISION', v: event.date_precision.replace('_', ' ') }] : []),
    { k: 'SLUG', v: event.slug },
  ].slice(0, 6)

  return (
    <div className="tl-root">
      {/* Topbar */}
      <div className="tl-topbar">
        <Link to="/" className="tl-topbar-link">Corpus</Link>
        <span className="tl-topbar-sep">/</span>
        <Link to="/" className="tl-topbar-link">Timeline</Link>
        <span className="tl-topbar-sep">/</span>
        <span style={{ color: era.color, fontFamily: 'IBM Plex Mono', fontSize: 11 }}>{era.label}</span>
        <span className="tl-topbar-sep">/</span>
        <span className="tl-topbar-active">{event.title}</span>
      </div>

      {/* Scrollable content */}
      <div className="tl-content">
        <div className="px-4 md:px-7 pt-4 pb-0">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors text-sm"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>
        {/* Parent back-link */}
        {event.parent && (
          <div className="ed-parent-link">
            <Link to={`/event/${event.parent.slug}`} className="ed-parent-back">
              ← {event.parent.title}
            </Link>
          </div>
        )}

        {/* Hero */}
        <header
          className="ed-hero"
          style={{ '--era': era.color, '--era-tint': era.tint } as React.CSSProperties}
        >
          <div className="ed-hero-stripe" />
          <div className="ed-hero-grid">
            <div>
              <div className="ed-hero-date-main">{date}</div>
              {event.location && <div className="ed-hero-date-sub">{event.location}</div>}
              <div className="ed-hero-id">{event.slug}</div>
            </div>

            <div className="ed-hero-body">
              <div className="ed-hero-badges">
                <span
                  className="ed-badge"
                  style={{ color: era.color, borderColor: era.color, background: era.tint }}
                >
                  <span className="ed-badge-dot" style={{ background: era.color }} />
                  {era.label}
                </span>
                <span className="ed-badge ed-badge-tier">
                  <span
                    className={`ed-tier-dot ed-tier-dot--${tierVariant}`}
                    style={{ '--era': era.color } as React.CSSProperties}
                  />
                  Tier {event.tier}
                </span>
                {event.wave && (
                  <span className="ed-badge">Wave {event.wave}</span>
                )}
                {(event.tags ?? []).map(tag => (
                  <span key={tag} className="ed-badge ed-badge-tag">{tag}</span>
                ))}
              </div>

              <h1 className="ed-hero-title">{event.title}</h1>

              {kvItems.length > 0 && (
                <div className="ed-hero-kv">
                  {kvItems.map(({ k, v }) => (
                    <div key={k} className="ed-kv">
                      <div className="ed-kv-k">{k}</div>
                      <div className="ed-kv-v">{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Two-col body */}
        <div className="ed-body">
          {/* Left column */}
          <div className="ed-left">
            {event.summary && (
              <section className="ed-section">
                <header className="ed-sec-head">
                  <span className="ed-sec-eyebrow">01</span>
                  <h2 className="ed-sec-title">Summary</h2>
                </header>
                <p className="ed-p">{event.summary}</p>
              </section>
            )}

            {event.significance && (
              <section className="ed-section">
                <header className="ed-sec-head">
                  <span className="ed-sec-eyebrow">02</span>
                  <h2 className="ed-sec-title">Significance</h2>
                </header>
                <div className="ed-sig" style={{ '--era': era.color } as React.CSSProperties}>
                  <p className="ed-sig-text">{event.significance}</p>
                </div>
              </section>
            )}

            {event.sub_events && event.sub_events.length > 0 && (
              <section className="ed-section">
                <header className="ed-sec-head">
                  <span className="ed-sec-eyebrow">03</span>
                  <h2 className="ed-sec-title">Sub-events</h2>
                  <span className="ed-sec-count">{event.sub_events.length}</span>
                </header>
                <div className="ed-subs">
                  {event.sub_events.map(sub => (
                    <div key={sub.id} className="ed-sub" style={{ '--era': era.color } as React.CSSProperties}>
                      <div className="ed-sub-rail">
                        <span className="ed-sub-node" style={{ borderColor: era.color }} />
                      </div>
                      <div>
                        <div className="ed-sub-head">
                          <span className="ed-sub-date">
                            {formatDate(sub)}
                          </span>
                          <TierDot tier={sub.tier} eraColor={era.color} />
                          <span className="ed-sub-title">{sub.title}</span>
                        </div>
                        {sub.summary && <p className="ed-sub-desc">{sub.summary}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Right column */}
          <aside className="ed-right">
            <SourcesCard sources={event.sources ?? []} />
            <EntitiesCard eventEntities={event.event_entities ?? []} />
            <ConnectionsCard connections={connections} />
          </aside>
        </div>
      </div>
    </div>
  )
}
