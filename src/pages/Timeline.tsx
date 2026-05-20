import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import './timeline.css'
import { useEvents } from '@/hooks/useEvents'
import { ERA_CONFIG, COLLECTIONS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { Era, Event } from '@/lib/types'

const ERA_ORDER: Era[] = [
  'pre_modern',
  'early_cold_war',
  'blue_book',
  'post_condon',
  'modern_revival',
  'disclosure',
]


function TierDot({ tier, era }: { tier: number; era: Era }) {
  const color = ERA_CONFIG[era].color
  const variant = tier === 1 ? 'filled' : tier === 2 ? 'outlined' : 'faint'
  return (
    <span
      className={`tier-dot tier-dot--${variant}`}
      style={{ '--era': color } as React.CSSProperties}
    />
  )
}

function SubEvent({ event }: { event: Event }) {
  const color = ERA_CONFIG[event.era].color
  return (
    <div className="sub-event" style={{ '--era': color } as React.CSSProperties}>
      <div className="se-rail-line" />
      <div className="se-rail-node" />
      <div className="se-body">
        <span className="se-date">{formatDate(event)}</span>
        <span className="se-title">{event.title}</span>
      </div>
    </div>
  )
}

function EventCard({ event, subEvents }: { event: Event; subEvents: Event[] }) {
  const color = ERA_CONFIG[event.era].color
  const navigate = useNavigate()
  return (
    <div
      className="event-card"
      style={{ '--era': color } as React.CSSProperties}
      onClick={() => navigate(`/event/${event.slug}`)}
    >
      <div className="era-stripe" />
      <div className="event-meta">
        <span className="event-date">{formatDate(event)}</span>
        <TierDot tier={event.tier} era={event.era} />
      </div>
      <div className="event-body">
        <h3 className="event-title">{event.title}</h3>
        {event.summary && <p className="event-summary">{event.summary}</p>}
        {subEvents.length > 0 && (
          <div className="sub-events">
            {subEvents.map(se => (
              <SubEvent key={se.id} event={se} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EraSection({
  era,
  events,
  subEventsByParent,
}: {
  era: Era
  events: Event[]
  subEventsByParent: Map<string, Event[]>
}) {
  const cfg = ERA_CONFIG[era]
  if (events.length === 0) return null
  return (
    <section className="era-section" style={{ '--era': cfg.color } as React.CSSProperties}>
      <div className="era-section-header">
        <div className="era-section-stripe" />
        <span className="era-section-code">{cfg.code}</span>
        <span className="era-section-label">{cfg.label}</span>
        <span className="era-section-span">{cfg.span}</span>
        <span className="era-section-count">{events.length} events</span>
      </div>
      <div className="event-cards">
        {events.map(ev => (
          <EventCard
            key={ev.id}
            event={ev}
            subEvents={subEventsByParent.get(ev.id) ?? []}
          />
        ))}
      </div>
    </section>
  )
}

export default function Timeline() {
  const [searchParams] = useSearchParams()
  const activeCollectionId = searchParams.get('collection')
  const activeCollection = COLLECTIONS.find(c => c.id === activeCollectionId) ?? null

  const [activeEra, setActiveEra] = useState<Era | null>(null)
  const [activeTier, setActiveTier] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Pass tag filter server-side; tier/wave collections are applied client-side below
  const tagFilter =
    activeCollection?.filter.kind === 'tag' ? activeCollection.filter.value : undefined

  const { data: allEvents = [], isLoading } = useEvents({ tag: tagFilter })

  const topLevel = useMemo(
    () => allEvents.filter(e => !e.parent_id),
    [allEvents],
  )

  const subEventsByParent = useMemo(() => {
    const map = new Map<string, Event[]>()
    allEvents
      .filter(e => e.parent_id)
      .forEach(e => {
        const kids = map.get(e.parent_id!) ?? []
        kids.push(e)
        map.set(e.parent_id!, kids)
      })
    return map
  }, [allEvents])

  const filtered = useMemo(() => {
    return topLevel.filter(e => {
      // Collection tier/wave predicate (tag already filtered server-side)
      if (activeCollection) {
        const f = activeCollection.filter
        if (f.kind === 'tier' && e.tier !== f.value) return false
        if (f.kind === 'wave' && e.wave !== f.value) return false
      }
      if (activeEra && e.era !== activeEra) return false
      if (activeTier && e.tier !== activeTier) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          e.title.toLowerCase().includes(q) ||
          (e.summary?.toLowerCase().includes(q) ?? false)
        )
      }
      return true
    })
  }, [topLevel, activeCollection, activeEra, activeTier, searchQuery])

  const groupedByEra = useMemo(() => {
    const map = new Map<Era, Event[]>()
    ERA_ORDER.forEach(era => map.set(era, []))
    filtered.forEach(e => map.get(e.era)?.push(e))
    return map
  }, [filtered])

  // Breadcrumb: collection > era > default
  const breadcrumb =
    activeCollection?.label ??
    (activeEra ? ERA_CONFIG[activeEra].label : 'All eras')

  return (
    <div className="tl-root">
      {/* Topbar */}
      <div className="tl-topbar">
        <span>Corpus</span>
        <span className="tl-topbar-sep">/</span>
        <span>Timeline</span>
        <span className="tl-topbar-sep">/</span>
        <span className="tl-topbar-active">{breadcrumb}</span>
      </div>

      {/* Filter bar */}
      <div className="tl-filterbar">
        <div className="tl-filter-row">
          <span className="tl-filter-label">ERA</span>
          <button
            className={`era-pill ${!activeEra ? 'active' : ''}`}
            style={{ '--era-color': 'rgba(255,255,255,0.5)' } as React.CSSProperties}
            onClick={() => setActiveEra(null)}
          >
            All
          </button>
          {ERA_ORDER.map(era => {
            const cfg = ERA_CONFIG[era]
            return (
              <button
                key={era}
                className={`era-pill ${activeEra === era ? 'active' : ''}`}
                style={{ '--era-color': cfg.color } as React.CSSProperties}
                onClick={() => setActiveEra(activeEra === era ? null : era)}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>

        <div className="tl-filter-row">
          <span className="tl-filter-label">TIER</span>
          {([null, 1, 2, 3] as (number | null)[]).map(t => (
            <button
              key={t ?? 'all'}
              className={`tier-pill ${activeTier === t ? 'active' : ''}`}
              onClick={() => setActiveTier(t)}
            >
              {t === null ? 'All' : `T${t}`}
            </button>
          ))}
          <div className="tl-spacer" />
          <div className="tl-search-wrap">
            <Search className="tl-search-icon" />
            <input
              className="tl-search"
              placeholder="Search events…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <span className="tl-count">{filtered.length} events</span>
        </div>
      </div>

      {/* Content */}
      <div className="tl-content">
        {isLoading ? (
          <div className="tl-loading">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="tl-skeleton"
                style={{ height: `${64 + (i % 3) * 20}px` }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="tl-empty">No events match your filters.</div>
        ) : (
          ERA_ORDER.map(era => (
            <EraSection
              key={era}
              era={era}
              events={groupedByEra.get(era) ?? []}
              subEventsByParent={subEventsByParent}
            />
          ))
        )}
      </div>
    </div>
  )
}
