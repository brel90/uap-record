import { useState, useRef, useEffect, useMemo } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './search.css'
import { useSearch } from '@/hooks/useSearch'
import type { EntityWithCount } from '@/hooks/useSearch'
import { ERA_CONFIG } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { Event, Entity, EntityType } from '@/lib/types'

const SUGGESTIONS = [
  'Roswell', 'Luis Elizondo', 'AATIP', 'crash retrieval',
  'Project Blue Book', 'Nimitz', 'Rendlesham',
]

const ENTITY_TYPE_LABEL: Record<EntityType, string> = {
  person: 'PERSON',
  organization: 'ORG',
  program: 'PROGRAM',
  location: 'LOCATION',
  document: 'DOCUMENT',
}

// ── Helpers ────────────────────────────────────────────────

function firstSentence(s: string): string {
  const m = s.match(/^[^.!?]+[.!?]/)
  return m ? m[0] : s
}


// ── Highlight ──────────────────────────────────────────────

function Hl({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>
  const lower = text.toLowerCase()
  const i = lower.indexOf(q.toLowerCase())
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark className="hl">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

// ── Entity icon ────────────────────────────────────────────

function EntIcon({ type }: { type: EntityType }) {
  const p = { width: 14, height: 14, viewBox: '0 0 14 14', fill: 'none' } as const
  switch (type) {
    case 'person':
      return (
        <svg {...p}>
          <circle cx="7" cy="5" r="2.3" stroke="currentColor" strokeWidth="1.1" />
          <path d="M2.5 12c0-2.5 2-4.2 4.5-4.2s4.5 1.7 4.5 4.2" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      )
    case 'organization':
      return (
        <svg {...p}>
          <rect x="2" y="3" width="10" height="9" stroke="currentColor" strokeWidth="1.1" />
          <line x1="2" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1.1" />
          <line x1="7" y1="6" x2="7" y2="12" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      )
    case 'program':
      return (
        <svg {...p}>
          <rect x="2" y="2.5" width="10" height="9" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
          <line x1="4" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.1" />
          <line x1="4" y1="7" x2="10" y2="7" stroke="currentColor" strokeWidth="1.1" />
          <line x1="4" y1="9" x2="8" y2="9" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      )
    case 'location':
      return (
        <svg {...p}>
          <path d="M7 1.5c-2.5 0-4 2-4 4 0 3 4 7 4 7s4-4 4-7c0-2-1.5-4-4-4z" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="7" cy="5.5" r="1.3" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      )
    case 'document':
      return (
        <svg {...p}>
          <path d="M3 1.5h6l3 3v8H3z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
          <path d="M9 1.5v3h3" stroke="currentColor" strokeWidth="1.1" />
          <line x1="5" y1="7" x2="10" y2="7" stroke="currentColor" strokeWidth="1.1" />
          <line x1="5" y1="9" x2="10" y2="9" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      )
  }
}

// ── Result rows ────────────────────────────────────────────

function EventResult({ event, q }: { event: Event; q: string }) {
  const era = ERA_CONFIG[event.era]
  const date = formatDate(event)
  const navigate = useNavigate()
  return (
    <div className="rr rr-event" style={{ '--era': era.color } as React.CSSProperties} onClick={() => navigate(`/event/${event.slug}`)}>
      <div className="rr-stripe" />
      <div className="rr-body">
        <div className="rr-head">
          <span className="rr-kind">EVENT</span>
          <span className="rr-era" style={{ color: era.color, borderColor: era.color }}>
            {era.code}
          </span>
          {date && <span className="rr-date">{date}</span>}
          <span className="rr-id">{event.slug}</span>
        </div>
        <div className="rr-title">
          <Hl text={event.title} q={q} />
        </div>
        {event.summary && (
          <div className="rr-desc">
            <Hl text={firstSentence(event.summary)} q={q} />
          </div>
        )}
      </div>
      <div className="rr-aside">
        <span
          className="tier-dot"
          style={{
            '--era': era.color,
            ...(event.tier === 1
              ? { background: era.color }
              : event.tier === 2
                ? { background: 'transparent' }
                : { background: 'transparent', borderColor: `color-mix(in srgb, ${era.color} 30%, transparent)` }),
          } as React.CSSProperties}
        />
        <span className="rr-aside-label">T{event.tier}</span>
      </div>
    </div>
  )
}

function EntityResult({ entity, q }: { entity: EntityWithCount; q: string }) {
  const navigate = useNavigate()
  return (
    <div className="rr" style={{ cursor: 'pointer' }} onClick={() => navigate(`/entity/${entity.id}`)}>
      <div className="rr-icon">
        <EntIcon type={entity.type} />
      </div>
      <div className="rr-body">
        <div className="rr-head">
          <span className="rr-kind">ENTITY</span>
          <span className="rr-kind" style={{ color: 'rgba(255,255,255,0.3)', borderColor: 'transparent' }}>
            {ENTITY_TYPE_LABEL[entity.type]}
          </span>
        </div>
        <div className="rr-title">
          <Hl text={entity.name} q={q} />
        </div>
        {entity.description && (
          <div className="rr-desc">
            <Hl text={entity.description} q={q} />
          </div>
        )}
      </div>
      <div className="rr-aside">
        <span className="rr-aside-num">{entity.event_count}</span>
        <span className="rr-aside-label">events</span>
      </div>
    </div>
  )
}

// ── Result group ───────────────────────────────────────────

const SHOW_LIMIT = 12

function ResultGroup({
  title,
  count,
  hint,
  children,
  total,
  onShowMore,
}: {
  title: string
  count: number
  hint: string
  children: React.ReactNode
  total: number
  onShowMore?: () => void
}) {
  return (
    <section className="rg">
      <header className="rg-head">
        <div className="rg-head-l">
          <h2 className="rg-title">{title}</h2>
          <span className="rg-count">{count}</span>
        </div>
        <span className="rg-hint">{hint}</span>
      </header>
      <div className="rg-list">{children}</div>
      {total > SHOW_LIMIT && onShowMore && (
        <button className="show-more" onClick={onShowMore}>
          <span className="show-more-line" />
          <span>Show {total - SHOW_LIMIT} more ↓</span>
          <span className="show-more-line" />
        </button>
      )}
    </section>
  )
}

// ── Suggestions ────────────────────────────────────────────

function SuggestionsPanel({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="sp">
      <div className="sp-block">
        <div className="sp-eyebrow">SUGGESTED</div>
        <div className="sp-chips">
          {SUGGESTIONS.map(s => (
            <button key={s} className="sp-chip" onClick={() => onPick(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="sp-block sp-tips">
        <div className="sp-eyebrow">QUERY TIPS</div>
        <ul className="sp-tip-list">
          <li><code>era:disclosure</code> limit to a specific era</li>
          <li><code>tier:1</code> only well-documented core events</li>
          <li><code>type:program</code> restrict to entity type</li>
          <li><code>before:1970</code> · <code>after:2017</code> date range</li>
        </ul>
      </div>
    </div>
  )
}

// ── No results ─────────────────────────────────────────────

function NoResults({ query }: { query: string }) {
  const nav = useNavigate()
  return (
    <div className="search-empty">
      <div className="search-empty-glyph">∅</div>
      <div className="search-empty-title">No matches for &ldquo;{query}&rdquo;</div>
      <div className="search-empty-sub">
        Try a broader term, check spelling, or browse the{' '}
        <button className="search-empty-link" onClick={() => nav('/')}>
          Timeline
        </button>
        .
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────

type FilterType = 'all' | 'events' | 'entities'
type SortMode = 'relevance' | 'date'

export default function Search() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortMode>('relevance')
  const [showAllEvents, setShowAllEvents] = useState(false)
  const [showAllEntities, setShowAllEntities] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // 300ms debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // Reset show-all when debounced query changes
  useEffect(() => {
    setShowAllEvents(false)
    setShowAllEntities(false)
  }, [debouncedQuery])

  const { data, isFetching } = useSearch(debouncedQuery)

  const sortedEvents = useMemo<Event[]>(() => {
    const evts = data?.events ?? []
    if (sort === 'date') {
      return [...evts].sort((a, b) => {
        const da = a.date_start ?? String(a.date_year_start ?? 0)
        const db = b.date_start ?? String(b.date_year_start ?? 0)
        return da.localeCompare(db)
      })
    }
    return evts
  }, [data?.events, sort])

  const entities = data?.entities ?? []

  const totals = {
    events: sortedEvents.length,
    entities: entities.length,
    all: sortedEvents.length + entities.length,
  }

  const hasQuery = debouncedQuery.trim().length > 1
  const anyResults = totals.all > 0

  const showEvents = (filterType === 'all' || filterType === 'events') && sortedEvents.length > 0
  const showEntities = (filterType === 'all' || filterType === 'entities') && entities.length > 0

  const visibleEvents = showAllEvents ? sortedEvents : sortedEvents.slice(0, SHOW_LIMIT)
  const visibleEntities = showAllEntities ? entities : entities.slice(0, SHOW_LIMIT)

  const q = debouncedQuery.trim().toLowerCase()
  const breadcrumb = query.trim() ? `"${query.trim()}"` : '—'

  return (
    <div className="tl-root">
      {/* Topbar */}
      <div className="tl-topbar">
        <span>Corpus</span>
        <span className="tl-topbar-sep">/</span>
        <span>Search</span>
        <span className="tl-topbar-sep">/</span>
        <span className="tl-topbar-active">{breadcrumb}</span>
      </div>

      {/* Hero */}
      <div className="search-hero">
        <div className="search-input-wrap">
          <span className="search-input-icon">
            <SearchIcon size={16} />
          </span>
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search events, entities, sources…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="search-input-clear" onClick={() => setQuery('')}>×</button>
          )}
          {!query && <span className="search-input-kbd">/</span>}
        </div>

        <div className="search-filters">
          <div className="fb-group">
            <div className="fb-label">TYPE</div>
            <div className="seg">
              {([
                { v: 'all', label: 'All', n: totals.all },
                { v: 'events', label: 'Events', n: totals.events },
                { v: 'entities', label: 'Entities', n: totals.entities },
              ] as { v: FilterType; label: string; n: number }[]).map(o => (
                <button
                  key={o.v}
                  className={`seg-btn ${filterType === o.v ? 'is-on' : ''}`}
                  onClick={() => setFilterType(o.v)}
                >
                  {o.label}
                  {hasQuery && <span className="seg-count">{o.n}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="fb-group">
            <div className="fb-label">SORT</div>
            <div className="seg">
              <button
                className={`seg-btn ${sort === 'relevance' ? 'is-on' : ''}`}
                onClick={() => setSort('relevance')}
              >
                Relevance
              </button>
              <button
                className={`seg-btn ${sort === 'date' ? 'is-on' : ''}`}
                onClick={() => setSort('date')}
              >
                Date
              </button>
            </div>
          </div>

          <div className="fb-spacer" />

          {hasQuery && !isFetching && (
            <div className="fb-count">
              <span className="fb-count-n">{totals.all}</span>
              <span>results</span>
            </div>
          )}
          {isFetching && (
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
              searching…
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="tl-content">
        <div className="content-search">
          {!hasQuery ? (
            <SuggestionsPanel onPick={s => setQuery(s)} />
          ) : !anyResults && !isFetching ? (
            <NoResults query={query} />
          ) : (
            <>
              {showEvents && (
                <ResultGroup
                  title="Events"
                  count={sortedEvents.length}
                  hint="Cataloged incidents with a date, location, and tier."
                  total={sortedEvents.length}
                  onShowMore={() => setShowAllEvents(true)}
                >
                  {visibleEvents.map(e => (
                    <EventResult key={e.id} event={e} q={q} />
                  ))}
                </ResultGroup>
              )}
              {showEntities && (
                <ResultGroup
                  title="Entities"
                  count={entities.length}
                  hint="People, organizations, programs, locations, and primary documents."
                  total={entities.length}
                  onShowMore={() => setShowAllEntities(true)}
                >
                  {visibleEntities.map(e => (
                    <EntityResult key={e.id} entity={e} q={q} />
                  ))}
                </ResultGroup>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
