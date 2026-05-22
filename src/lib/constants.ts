import type { Era, ConnectionType } from './types'

export const ERA_CONFIG: Record<
  Era,
  { label: string; code: string; span: string; color: string; tint: string; bgClass: string }
> = {
  pre_modern: {
    label: 'Pre-Modern',
    code: 'PRE',
    span: 'pre-1947',
    color: '#1a3a5c',
    tint: 'rgba(26,58,92,0.15)',
    bgClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  },
  early_cold_war: {
    label: 'Early Cold War',
    code: 'ECW',
    span: '1947–1953',
    color: '#0d5c8a',
    tint: 'rgba(13,92,138,0.15)',
    bgClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  blue_book: {
    label: 'Blue Book Era',
    code: 'BB',
    span: '1952–1969',
    color: '#1a1a6e',
    tint: 'rgba(26,26,110,0.15)',
    bgClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  },
  post_condon: {
    label: 'Post-Condon',
    code: 'PC',
    span: '1969–2004',
    color: '#3d1a6e',
    tint: 'rgba(61,26,110,0.15)',
    bgClass: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  },
  modern_revival: {
    label: 'Modern Revival',
    code: 'MR',
    span: '2004–2017',
    color: '#6e3d0d',
    tint: 'rgba(110,61,13,0.15)',
    bgClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  disclosure: {
    label: 'Disclosure Era',
    code: 'DIS',
    span: '2017–present',
    color: '#0d6e4a',
    tint: 'rgba(13,110,74,0.15)',
    bgClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
}

// ── Collections ────────────────────────────────────────────

export type CollectionFilter =
  | { kind: 'tier'; value: number }
  | { kind: 'wave'; value: number }
  | { kind: 'tag'; value: string }

export interface Collection {
  id: string
  label: string
  filter: CollectionFilter
}

export const COLLECTIONS: Collection[] = [
  { id: 'tier1',             label: 'Tier 1 only',       filter: { kind: 'tier', value: 1 } },
  { id: 'wave1',             label: 'Wave 1',             filter: { kind: 'wave', value: 1 } },
  { id: 'wave2',             label: 'Wave 2',             filter: { kind: 'wave', value: 2 } },
  { id: 'physical_evidence', label: 'Physical evidence',  filter: { kind: 'tag',  value: 'physical_evidence' } },
  { id: 'whistleblower',     label: 'Whistleblowers',     filter: { kind: 'tag',  value: 'whistleblower' } },
  { id: 'congressional',     label: 'Congressional',      filter: { kind: 'tag',  value: 'congressional' } },
  { id: 'pilot_encounter',    label: 'Pilot encounters',   filter: { kind: 'tag',  value: 'pilot_encounter' } },
  { id: 'suppression_record', label: 'Suppression Record', filter: { kind: 'tag',  value: 'suppression_related' } },
  { id: 'pursue_releases',   label: 'PURSUE Releases',    filter: { kind: 'tag',  value: 'pursue_release' } },
]

export const CONNECTION_TYPE_CONFIG: Record<ConnectionType, { label: string; color: string }> = {
  causal:        { label: 'Causal',        color: '#ff3333' },
  institutional: { label: 'Institutional', color: '#3399ff' },
  thematic:      { label: 'Thematic',      color: '#1a2a3a' },
  investigative: { label: 'Investigative', color: '#ff9900' },
  legislative:   { label: 'Legislative',   color: '#aa44ff' },
  personnel:     { label: 'Personnel',     color: '#33ff99' },
  suppression:   { label: 'Suppression',   color: '#ff0000' },
  debunking:     { label: 'Debunking',     color: '#cc6600' },
}
