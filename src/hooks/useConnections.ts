import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface RawEvent {
  id: string
  title: string
  era: string
  tier: number
  slug: string
  parent_event_id: string | null
  summary: string | null
  date_start: string | null
  date_year_start: number | null
}

export interface RawConnection {
  from_event_id: string
  to_event_id: string
  connection_type: string
  strength: number | null
  description: string | null
}

export interface GraphRawData {
  events: RawEvent[]
  connections: RawConnection[]
}

export function useConnections() {
  return useQuery<GraphRawData>({
    queryKey: ['connections'],
    queryFn: async () => {
      // Query 1: events
      const eventsRes = await supabase
        .from('events')
        .select('id, title, era, tier, slug, parent_event_id, summary, date_start, date_year_start')

      if (eventsRes.error) {
        console.error('[useConnections] events query failed:', eventsRes.error)
        throw eventsRes.error
      }
      const events = (eventsRes.data ?? []) as RawEvent[]
      console.log('[useConnections] events:', events.length)

      // Query 2: connections
      const connsRes = await supabase
        .from('connections')
        .select('from_event_id, to_event_id, connection_type, strength, description')

      if (connsRes.error) {
        console.error('[useConnections] connections query failed:', connsRes.error)
        throw connsRes.error
      }
      const connections = (connsRes.data ?? []) as RawConnection[]
      console.log('[useConnections] connections:', connections.length)

      if (connections.length > 0) {
        const s = connections[0]
        console.log('[useConnections] sample:', s.from_event_id, '→', s.to_event_id, `[${s.connection_type}]`)
      } else {
        console.warn('[useConnections] connections table returned 0 rows — check RLS policies and table name')
      }

      return { events, connections }
    },
  })
}
