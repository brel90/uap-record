import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Event } from '@/lib/types'

export function useEventsBySlug(slugs: string[]) {
  return useQuery<Event[]>({
    queryKey: ['events-by-slug', slugs],
    enabled: slugs.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .in('slug', slugs)
      if (error) throw error
      // Preserve the order of slugs from the station definition
      const map = new Map((data ?? []).map(e => [e.slug, e]))
      return slugs.map(s => map.get(s)).filter(Boolean) as Event[]
    },
  })
}
