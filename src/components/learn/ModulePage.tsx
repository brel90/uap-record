import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import './module.css'
import { getModuleById } from '@/data/modules'
import type { LearningModule, Station } from '@/data/modules'
import { useEventsBySlug } from '@/hooks/useEventsBySlug'
import { ERA_CONFIG } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { Event } from '@/lib/types'

// ── LocalStorage helpers ───────────────────────────────────

const STORAGE_KEY = 'uap-completed-modules'

function getCompleted(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') }
  catch { return [] }
}

function markComplete(id: string) {
  const c = getCompleted()
  if (!c.includes(id)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...c, id]))
  }
}

// ── AI API helpers ─────────────────────────────────────────

const MODEL = 'claude-sonnet-4-6'

interface BriefingData {
  briefing: string
  insight: string
}

function parseJSON(text: string): BriefingData {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON found')
  return JSON.parse(match[0]) as BriefingData
}

async function callAnthropic(system: string, user: string, maxTokens = 1000): Promise<string> {
  const res = await fetch('/api/anthropic', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  const data = await res.json() as { content: { text: string }[] }
  return data.content[0].text
}

const SYSTEM_PROMPT = `You are a guide for UAP Record, a historical research index built from primary sources including declassified government documents, congressional testimony, and military records. Your tone is direct, factual, and conviction-forward — like a knowledgeable friend who has studied this subject for years and wants to help someone understand it clearly for the first time. Never sensationalize. Never hedge unnecessarily. Speak from the evidence.`

async function generateBriefing(
  moduleName: string,
  station: Station,
  events: Event[]
): Promise<BriefingData> {
  const text = await callAnthropic(
    SYSTEM_PROMPT,
    `Write a station briefing for the "${moduleName}" module, station "${station.title}".

Relevant corpus events for this station:
${JSON.stringify(events.map(e => ({ title: e.title, summary: e.summary, date: e.date_start ?? e.date_year_start, era: e.era })), null, 2)}

Write exactly 3 paragraphs. Plain prose, no bullet points, no headers.
First paragraph: what happened at this station — the facts.
Second paragraph: why it matters — the significance.
Third paragraph: what this reveals about the larger pattern.

Then write one "What this means" insight — 2 sentences maximum — that connects this station to the module's overall arc.

Format your response as JSON:
{
  "briefing": "three paragraphs separated by double newlines",
  "insight": "two sentence insight here"
}`
  )
  return parseJSON(text)
}

async function generatePersonalResponse(
  moduleName: string,
  station: Station,
  userText: string
): Promise<string> {
  return callAnthropic(
    SYSTEM_PROMPT,
    `The reader is studying the "${moduleName}" module, station "${station.title}".

Reflection question: "${station.reflectionQuestion}"

Their response: "${userText}"

Write a single paragraph — no more than 4 sentences — that acknowledges what they said and deepens their thinking. Stay grounded in the historical evidence. Be a thoughtful peer, not a therapist. Do not start with "I" or flatter them.`,
    300
  )
}

async function generateSynthesis(module: LearningModule): Promise<string> {
  return callAnthropic(
    SYSTEM_PROMPT,
    `The reader has just completed the "${module.title}" module of UAP Record.

Module description: ${module.description}
Stations covered: ${module.stations.map(s => s.title).join(', ')}

Write exactly 3 sentences summarizing the arc of this module — what the record shows, taken as a whole. Start with "The record shows". Be concrete, not inspirational.`,
    200
  )
}

// ── Event card ─────────────────────────────────────────────

function EventCard({ event }: { event: Event }) {
  const era = ERA_CONFIG[event.era]
  const date = formatDate(event)
  return (
    <Link
      to={`/event/${event.slug}`}
      className="mp-event-card"
      style={{ '--era-color': era?.color ?? 'rgba(255,255,255,0.2)' } as React.CSSProperties}
    >
      <div className="mp-event-stripe" />
      <div className="mp-event-body">
        {date && <div className="mp-event-date">{date}</div>}
        <div className="mp-event-title">{event.title}</div>
      </div>
      <div className="mp-event-arrow">→</div>
    </Link>
  )
}

// ── Shimmer ────────────────────────────────────────────────

function Shimmer() {
  return (
    <div className="mp-shimmer">
      <div className="mp-shimmer-line" style={{ width: '100%' }} />
      <div className="mp-shimmer-line" style={{ width: '88%' }} />
      <div className="mp-shimmer-line" style={{ width: '94%' }} />
      <div className="mp-shimmer-line" style={{ width: '72%' }} />
      <div className="mp-shimmer-line" style={{ width: '82%' }} />
      <div className="mp-shimmer-line" style={{ width: '60%' }} />
      <div className="mp-shimmer-label">Generating briefing from corpus data…</div>
    </div>
  )
}

// ── Completion screen ──────────────────────────────────────

interface CompletionProps {
  module: LearningModule
  synthesisText: string | null
  isSynthesisLoading: boolean
}

function CompletionScreen({ module, synthesisText, isSynthesisLoading }: CompletionProps) {
  const navigate = useNavigate()
  const allDone = getCompleted().length >= 3
  const typeLabel = module.completion.type.toUpperCase()

  return (
    <div className="mp-content">
      <div className="mp-completion">
        <div className="mp-completion-eyebrow">Module complete</div>
        <h2 className="mp-completion-title">{module.title}</h2>
        <hr className="mp-completion-rule" />

        {isSynthesisLoading ? (
          <Shimmer />
        ) : (
          <p className="mp-synthesis">{synthesisText}</p>
        )}

        <div className="mp-next-label">What to explore next</div>

        <div className="mp-rec-card">
          <div
            className="mp-rec-type"
            style={{ color: module.color, borderColor: module.color }}
          >
            {typeLabel}
          </div>
          <div className="mp-rec-title">{module.completion.title}</div>
          <div className="mp-rec-author">{module.completion.author}</div>
          <p className="mp-rec-desc">{module.completion.description}</p>
        </div>

        {allDone && (
          <>
            <div className="mp-all-complete">You've completed the full record. One more:</div>
            <div className="mp-rec-card">
              <div className="mp-rec-type" style={{ color: '#7c3aed', borderColor: '#7c3aed' }}>BOOK</div>
              <div className="mp-rec-title">In Plain Sight</div>
              <div className="mp-rec-author">Ross Coulthart</div>
              <p className="mp-rec-desc">
                An Australian investigative journalist goes looking for the truth about UAPs and finds that
                the evidence was never hidden — it was just ignored. Written for exactly the reader who has
                just completed this index: someone who came in skeptical and left with questions that won't go away.
              </p>
            </div>
          </>
        )}

        <div className="mp-completion-actions">
          <button className="mp-btn-secondary" onClick={() => navigate('/learn')}>
            Return to Learn
          </button>
          <Link to="/" className="mp-btn-primary">
            Explore the Full Corpus →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Station view ───────────────────────────────────────────

interface StationViewProps {
  module: LearningModule
  station: Station
  stationIndex: number
  onContinue: () => void
}

function StationView({ module, station, stationIndex, onContinue }: StationViewProps) {
  const [briefing, setBriefing] = useState<BriefingData | null>(null)
  const [isBriefingLoading, setIsBriefingLoading] = useState(false)
  const [userReflection, setUserReflection] = useState('')
  const [personalResponse, setPersonalResponse] = useState<string | null>(null)
  const [isPersonalLoading, setIsPersonalLoading] = useState(false)
  const generatingRef = useRef<string | null>(null)

  const { data: events = [], isLoading: eventsLoading } = useEventsBySlug(station.eventSlugs)

  // Generate briefing when events load
  useEffect(() => {
    const key = `${stationIndex}`
    if (eventsLoading || generatingRef.current === key) return

    generatingRef.current = key
    setIsBriefingLoading(true)
    setBriefing(null)

    generateBriefing(module.title, station, events)
      .then(data => {
        if (generatingRef.current === key) setBriefing(data)
      })
      .catch((err: unknown) => {
        console.error('[Learn] briefing generation failed:', err)
        if (generatingRef.current === key) {
          const msg = err instanceof Error ? err.message : String(err)
          setBriefing({
            briefing: `Briefing unavailable: ${msg}`,
            insight: 'Open DevTools → Console for full details.',
          })
        }
      })
      .finally(() => {
        if (generatingRef.current === key) setIsBriefingLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationIndex, eventsLoading])

  const handleShare = async () => {
    if (!userReflection.trim() || isPersonalLoading) return
    setIsPersonalLoading(true)
    try {
      const resp = await generatePersonalResponse(module.title, station, userReflection)
      setPersonalResponse(resp)
    } catch (err: unknown) {
      console.error('[Learn] personal response failed:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setPersonalResponse(`Unable to generate response: ${msg}`)
    } finally {
      setIsPersonalLoading(false)
    }
  }

  const paragraphs = briefing?.briefing.split(/\n\n+/).filter(Boolean) ?? []

  return (
    <div className="mp-content">
      <div
        className="mp-station"
        style={{ '--module-color': module.color } as React.CSSProperties}
      >
        {/* Station header */}
        <div className="mp-station-num">
          STATION {String(station.id).padStart(2, '0')} / {module.stations.length}
        </div>
        <div className="mp-station-label">{station.title}</div>

        {/* Briefing */}
        {isBriefingLoading || eventsLoading ? (
          <Shimmer />
        ) : (
          <div className="mp-briefing">
            {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        )}

        {/* Event cards */}
        {events.length > 0 && (
          <div className="mp-events">
            {events.map(ev => <EventCard key={ev.id} event={ev} />)}
          </div>
        )}

        {/* Insight */}
        {briefing?.insight && !isBriefingLoading && (
          <div className="mp-insight">
            <div className="mp-insight-label">What this means</div>
            <p className="mp-insight-text">{briefing.insight}</p>
          </div>
        )}

        {/* Reflection */}
        {!isBriefingLoading && (
          <>
            <hr className="mp-reflection-rule" />
            <p className="mp-reflection-q">{station.reflectionQuestion}</p>

            <textarea
              className="mp-textarea"
              rows={3}
              placeholder="Your thoughts…"
              value={userReflection}
              onChange={e => setUserReflection(e.target.value)}
            />

            {personalResponse && (
              <div className="mp-personal-response">{personalResponse}</div>
            )}

            <div className="mp-actions">
              {!personalResponse && (
                <button
                  className="mp-share-btn"
                  disabled={!userReflection.trim() || isPersonalLoading}
                  onClick={handleShare}
                >
                  {isPersonalLoading ? 'Thinking…' : 'Share your thinking →'}
                </button>
              )}

              <button className="mp-continue-btn" onClick={onContinue}>
                {stationIndex < module.stations.length - 1 ? (
                  <>Continue <ArrowRight size={13} /></>
                ) : (
                  <>Complete module <ArrowRight size={13} /></>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main module page ───────────────────────────────────────

export default function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const navigate = useNavigate()

  const module = moduleId ? getModuleById(moduleId) : undefined

  const [stationIndex, setStationIndex] = useState(0)
  const [visitedStations, setVisitedStations] = useState<Set<number>>(new Set([0]))
  const [isComplete, setIsComplete] = useState(false)
  const [synthesisText, setSynthesisText] = useState<string | null>(null)
  const [isSynthesisLoading, setIsSynthesisLoading] = useState(false)

  // Stable station key so StationView remounts on navigation
  const [stationKey, setStationKey] = useState(0)

  if (!module) {
    return (
      <div className="mp-root" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>
          Module not found. <button onClick={() => navigate('/learn')} style={{ color: 'inherit', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Return to Learn</button>
        </div>
      </div>
    )
  }

  const handleContinue = () => {
    if (stationIndex < module.stations.length - 1) {
      const next = stationIndex + 1
      setStationIndex(next)
      setVisitedStations(prev => new Set([...prev, next]))
      setStationKey(k => k + 1)
      // Scroll content to top
      document.querySelector('.mp-content')?.scrollTo(0, 0)
    } else {
      markComplete(module.id)
      setIsComplete(true)
      setIsSynthesisLoading(true)
      generateSynthesis(module)
        .then(setSynthesisText)
        .catch(() => setSynthesisText(`The record shows a consistent pattern: ${module.description}`))
        .finally(() => setIsSynthesisLoading(false))
    }
  }

  return (
    <div className="mp-root">
      {/* Top bar */}
      <div className="mp-topbar">
        <button className="mp-topbar-back" onClick={() => navigate('/learn')}>
          <ArrowLeft size={12} /> Learn
        </button>
        <div className="mp-topbar-title">{module.title}</div>
        <div className="mp-progress">
          {module.stations.map((_, i) => {
            const cls = isComplete || visitedStations.has(i)
              ? i === stationIndex && !isComplete ? 'mp-dot mp-dot--current' : 'mp-dot mp-dot--visited'
              : 'mp-dot mp-dot--future'
            return (
              <div
                key={i}
                className={cls}
                style={i === stationIndex && !isComplete ? { background: module.color } : undefined}
              />
            )
          })}
        </div>
      </div>

      {/* Body */}
      {isComplete ? (
        <CompletionScreen
          module={module}
          synthesisText={synthesisText}
          isSynthesisLoading={isSynthesisLoading}
        />
      ) : (
        <StationView
          key={stationKey}
          module={module}
          station={module.stations[stationIndex]}
          stationIndex={stationIndex}
          onContinue={handleContinue}
        />
      )}
    </div>
  )
}
