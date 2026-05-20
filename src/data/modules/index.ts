export interface Station {
  id: number
  title: string
  eventSlugs: string[]
  reflectionQuestion: string
}

export interface ModuleCompletion {
  type: 'book' | 'podcast' | 'documentary'
  title: string
  author: string
  description: string
}

export interface LearningModule {
  id: string
  title: string
  description: string
  color: string
  stations: Station[]
  completion: ModuleCompletion
}

export { institutionalStory } from './institutional-story'
export { suppressionRecord } from './suppression-record'
export { disclosureArc } from './disclosure-arc'

import { institutionalStory } from './institutional-story'
import { suppressionRecord } from './suppression-record'
import { disclosureArc } from './disclosure-arc'

export const MODULES: LearningModule[] = [
  institutionalStory,
  suppressionRecord,
  disclosureArc,
]

export function getModuleById(id: string): LearningModule | undefined {
  return MODULES.find(m => m.id === id)
}
