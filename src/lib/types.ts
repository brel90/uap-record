export type Era =
  | 'pre_modern'
  | 'early_cold_war'
  | 'blue_book'
  | 'post_condon'
  | 'modern_revival'
  | 'disclosure'

export type DatePrecision = 'day' | 'month' | 'year' | 'year_range'

export type ConnectionType =
  | 'causal'
  | 'institutional'
  | 'thematic'
  | 'investigative'
  | 'legislative'
  | 'personnel'
  | 'suppression'
  | 'debunking'

export type EntityType =
  | 'person'
  | 'organization'
  | 'program'
  | 'location'
  | 'document'

export interface Event {
  id: string
  slug: string
  title: string
  date_start: string | null
  date_end: string | null
  date_year_start: number | null
  date_year_end: number | null
  date_precision: DatePrecision
  era: Era
  wave: number | null
  tier: number
  summary: string | null
  significance: string | null
  original_prompt: string | null
  parent_id: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  tags: string[] | null
  image_url: string | null
  image_caption: string | null
  image_credit: string | null
  created_at: string
  updated_at: string
}

export interface Source {
  id: string
  event_id: string
  tier: number
  label: string
  url: string | null
  wayback_url: string | null
  authors: string[] | null
  publication_year: number | null
  notes: string | null
  created_at: string
}

export interface Entity {
  id: string
  slug: string
  name: string
  type: EntityType
  description: string | null
  created_at: string
}

export interface EventEntity {
  id: string
  event_id: string
  entity_id: string
  role: string | null
  entity?: Entity
}

export interface Connection {
  id: string
  from_event_id: string
  to_event_id: string
  type: ConnectionType
  description: string | null
  strength: number | null
  created_at: string
}

// Enriched types for views that join related data
export interface EventWithRelations extends Event {
  sources: Source[]
  event_entities: EventEntity[]
  sub_events: Event[]
  parent: Event | null
}

export interface GraphData {
  events: Event[]
  connections: Connection[]
}
