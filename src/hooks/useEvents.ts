import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Era, Event } from '@/lib/types'

export interface UseEventsOptions {
  era?: Era
  tier?: number
  wave?: number
  tag?: string
}

export function useEvents(options: UseEventsOptions = {}) {
  return useQuery<Event[]>({
    queryKey: ['events', options],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*')
        .order('date_start', { ascending: true })

      if (options.era) query = query.eq('era', options.era)
      if (options.tier) query = query.eq('tier', options.tier)
      if (options.wave) query = query.eq('wave', options.wave)
      if (options.tag) query = query.contains('tags', [options.tag])

      const { data, error } = await query
      console.log('useEvents error:', error)
      console.log('useEvents data:', data)
      if (error) throw error
      return data ?? []
    },
  })
}
