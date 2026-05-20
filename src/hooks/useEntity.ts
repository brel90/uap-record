import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Entity } from '@/lib/types'

export interface EntityAppearance {
  event_id: string
  role: string | null
  event_title: string
  event_slug: string
  event_era: string
  event_tier: number
}

export interface EntityWithAppearances {
  entity: Entity
  appearances: EntityAppearance[]
}

export function useEntity(id: string) {
  return useQuery<EntityWithAppearances | null>({
    queryKey: ['entity', id],
    enabled: !!id,
    queryFn: async () => {
      // Query 1: fetch entity
      const entityRes = await supabase
        .from('entities')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (entityRes.error) throw entityRes.error
      if (!entityRes.data) return null

      // Query 2: fetch event_entities rows for this entity
      const eeRes = await supabase
        .from('event_entities')
        .select('event_id, role')
        .eq('entity_id', id)

      if (eeRes.error) throw eeRes.error
      const eeRows = eeRes.data ?? []

      if (eeRows.length === 0) {
        return { entity: entityRes.data as Entity, appearances: [] }
      }

      // Query 3: fetch the actual events
      const eventIds = eeRows.map(r => r.event_id)
      const eventsRes = await supabase
        .from('events')
        .select('id, title, slug, era, tier')
        .in('id', eventIds)
        .order('date_start', { ascending: true, nullsFirst: false })

      if (eventsRes.error) throw eventsRes.error
      const eventsById = new Map((eventsRes.data ?? []).map(e => [e.id, e]))

      const appearances: EntityAppearance[] = eeRows
        .map(row => {
          const ev = eventsById.get(row.event_id)
          if (!ev) return null
          return {
            event_id: ev.id,
            role: row.role,
            event_title: ev.title,
            event_slug: ev.slug,
            event_era: ev.era,
            event_tier: ev.tier,
          }
        })
        .filter((a): a is EntityAppearance => a !== null)

      return { entity: entityRes.data as Entity, appearances }
    },
  })
}
