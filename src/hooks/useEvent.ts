import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { EventWithRelations } from '@/lib/types'

export function useEvent(slug: string | undefined) {
  return useQuery<EventWithRelations | null>({
    queryKey: ['event', slug],
    enabled: !!slug,
    queryFn: async () => {
      if (!slug) return null

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          sources(*),
          event_entities(*, entity:entities(*))
        `)
        .eq('slug', slug)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      // Fetch sub-events and parent separately to avoid self-referential FK ambiguity
      const [subRes, parentRes] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .eq('parent_id', data.id)
          .order('date_start', { ascending: true, nullsFirst: false }),
        data.parent_id
          ? supabase.from('events').select('*').eq('id', data.parent_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      return {
        ...data,
        sub_events: subRes.data ?? [],
        parent: parentRes.data ?? null,
      } as EventWithRelations
    },
  })
}
