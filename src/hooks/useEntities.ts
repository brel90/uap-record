import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Entity, EntityType } from '@/lib/types'

interface UseEntitiesOptions {
  type?: EntityType
}

export function useEntities(options: UseEntitiesOptions = {}) {
  return useQuery<Entity[]>({
    queryKey: ['entities', options],
    queryFn: async () => {
      let query = supabase
        .from('entities')
        .select('*')
        .order('name', { ascending: true })

      if (options.type) query = query.eq('type', options.type)

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}
