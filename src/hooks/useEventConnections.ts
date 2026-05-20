import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Connection, Event } from '@/lib/types'

export interface ConnectionWithEvent extends Connection {
  related_event: Pick<Event, 'id' | 'slug' | 'title' | 'era' | 'date_start' | 'date_year_start'> | null
  direction: 'leads_to' | 'connected_from'
}

export function useEventConnections(eventId: string | undefined) {
  return useQuery<ConnectionWithEvent[]>({
    queryKey: ['event-connections', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      if (!eventId) return []

      const { data: conns, error } = await supabase
        .from('connections')
        .select('*')
        .or(`from_event_id.eq.${eventId},to_event_id.eq.${eventId}`)

      if (error) throw error
      if (!conns || conns.length === 0) return []

      // Collect related event IDs then fetch them in one query
      const relatedIds = conns.map(c =>
        c.from_event_id === eventId ? c.to_event_id : c.from_event_id
      )
      const { data: relatedEvents } = await supabase
        .from('events')
        .select('id, slug, title, era, date_start, date_year_start')
        .in('id', relatedIds)

      const eventMap = new Map((relatedEvents ?? []).map(e => [e.id, e]))

      return conns.map(conn => {
        const isLeadsTo = conn.from_event_id === eventId
        const relatedId = isLeadsTo ? conn.to_event_id : conn.from_event_id
        return {
          ...conn,
          related_event: eventMap.get(relatedId) ?? null,
          direction: isLeadsTo ? 'leads_to' : 'connected_from',
        } as ConnectionWithEvent
      })
    },
  })
}
