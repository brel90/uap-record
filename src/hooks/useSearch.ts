import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Event, Entity } from '@/lib/types'

export interface EntityWithCount extends Entity {
  event_count: number
}

export interface SearchResults {
  events: Event[]
  entities: EntityWithCount[]
}

export function useSearch(query: string) {
  return useQuery<SearchResults>({
    queryKey: ['search', query],
    enabled: query.trim().length > 1,
    queryFn: async () => {
      const q = query.trim().split(/\s+/).map(t => `${t}:*`).join(' & ')

      const [eventsRes, entitiesRes] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .textSearch('fts', q, { config: 'english' })
          .order('date_start', { ascending: true, nullsFirst: false })
          .limit(50),

        supabase
          .from('entities')
          .select('*, event_entities(count)')
          .textSearch('fts', q, { config: 'english' })
          .order('name', { ascending: true })
          .limit(30),
      ])

      if (eventsRes.error) throw eventsRes.error
      if (entitiesRes.error) throw entitiesRes.error

      const entities: EntityWithCount[] = (entitiesRes.data ?? []).map((row: any) => {
        const { event_entities, ...entity } = row
        const count = Array.isArray(event_entities) && event_entities[0]?.count
          ? Number(event_entities[0].count)
          : 0
        return { ...entity, event_count: count }
      })

      return {
        events: eventsRes.data ?? [],
        entities,
      }
    },
  })
}
