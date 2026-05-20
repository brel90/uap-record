import { useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useEntity } from '@/hooks/useEntity'
import { ERA_CONFIG } from '@/lib/constants'
import type { Era, EntityType } from '@/lib/types'
import './entity-detail.css'

const ERA_ORDER: Era[] = [
  'pre_modern',
  'early_cold_war',
  'blue_book',
  'post_condon',
  'modern_revival',
  'disclosure',
]

const ENTITY_TYPE_LABEL: Record<EntityType, string> = {
  person: 'Person',
  organization: 'Organization',
  program: 'Program',
  location: 'Location',
  document: 'Document',
}

export default function EntityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useEntity(id ?? '')

  const byEra = useMemo(() => {
    if (!data) return new Map<Era, typeof data?.appearances>()
    const map = new Map<Era, typeof data.appearances>()
    ERA_ORDER.forEach(era => map.set(era, []))
    for (const app of data.appearances) {
      const list = map.get(app.event_era as Era)
      if (list) list.push(app)
    }
    return map
  }, [data])

  if (isLoading) {
    return (
      <div className="en-root">
        <div className="tl-topbar">
          <span>Corpus</span>
          <span className="tl-topbar-sep">/</span>
          <span className="tl-topbar-active">Loading…</span>
        </div>
        <div className="en-loading">Loading entity…</div>
      </div>
    )
  }

  if (!data?.entity) {
    return (
      <div className="en-root">
        <div className="tl-topbar">
          <span>Corpus</span>
          <span className="tl-topbar-sep">/</span>
          <span className="tl-topbar-active">Not found</span>
        </div>
        <div className="en-not-found">
          <div className="en-not-found-glyph">∅</div>
          <div className="en-not-found-title">Entity not found</div>
          <div className="en-not-found-sub">
            <button className="graph-panel-link" style={{ display: 'inline', border: 'none', padding: 0, fontSize: 11 }} onClick={() => navigate(-1)}>
              Go back
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { entity, appearances } = data

  return (
    <div className="en-root">
      {/* Topbar */}
      <div className="tl-topbar">
        <span>Corpus</span>
        <span className="tl-topbar-sep">/</span>
        <button
          className="tl-topbar-link"
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', padding: 0 }}
          onClick={() => navigate(-1)}
        >
          Entities
        </button>
        <span className="tl-topbar-sep">/</span>
        <span className="tl-topbar-active">{entity.name}</span>
      </div>

      <div className="en-content">
        <div className="px-7 pt-4 pb-0">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors text-sm"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>
        {/* Header */}
        <div className="en-header">
          <div className="en-type-badge">
            {ENTITY_TYPE_LABEL[entity.type as EntityType] ?? entity.type}
          </div>
          <h1 className="en-name">{entity.name}</h1>
          {entity.description && (
            <p className="en-description">{entity.description}</p>
          )}
        </div>

        {/* Appearances */}
        {appearances.length > 0 && (
          <>
            <div className="en-section-label">
              Event appearances ({appearances.length})
            </div>
            {ERA_ORDER.map(era => {
              const group = byEra.get(era) ?? []
              if (group.length === 0) return null
              const cfg = ERA_CONFIG[era]
              return (
                <div
                  key={era}
                  className="en-era-group"
                  style={{ '--era': cfg.color } as React.CSSProperties}
                >
                  <div className="en-era-header">
                    <div className="en-era-stripe" />
                    <span className="en-era-code">{cfg.code}</span>
                    <span className="en-era-label">{cfg.label}</span>
                  </div>
                  {group.map((app: any) => (
                    <div
                      key={app.event_id}
                      className="en-event-row"
                      style={{ '--era': cfg.color } as React.CSSProperties}
                    >
                      <span className="en-event-tier">T{app.event_tier}</span>
                      <Link
                        to={`/event/${app.event_slug}`}
                        className="en-event-title"
                      >
                        {app.event_title}
                      </Link>
                      {app.role && (
                        <span className="en-event-role">{app.role}</span>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </>
        )}

        {appearances.length === 0 && (
          <div className="en-section-label">No event appearances recorded</div>
        )}
      </div>
    </div>
  )
}
