import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Era } from '@/lib/types'

// ── Types ────────────────────────────────────────────────────

export interface Citation {
  title: string
  slug: string
  era: Era
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

// ── Helpers ──────────────────────────────────────────────────

type SlimEvent = { slug: string; title: string; era: string; tier: number }

/** Find [[Event Title]] patterns and resolve them to corpus events. */
function parseCitations(text: string, events: SlimEvent[]): Citation[] {
  const seen = new Set<string>()
  const citations: Citation[] = []
  const regex = /\[\[([^\]]+)\]\]/g
  let match
  while ((match = regex.exec(text)) !== null) {
    const rawTitle = match[1]
    if (seen.has(rawTitle)) continue
    seen.add(rawTitle)
    const event = events.find(
      e =>
        e.title.toLowerCase().includes(rawTitle.toLowerCase()) ||
        rawTitle.toLowerCase().includes(e.title.toLowerCase()),
    )
    if (event) {
      citations.push({ title: rawTitle, slug: event.slug, era: event.era as Era })
    }
  }
  return citations
}

/** Strip [[ ]] brackets from displayed text but keep the inner label. */
function cleanResponse(text: string): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, '$1')
}

// ── Hook ─────────────────────────────────────────────────────

export function useArchivist() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || isLoading) return

      // Add the user message immediately for optimistic UI
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userMessage,
      }
      setMessages(prev => [...prev, userMsg])
      setIsLoading(true)

      try {
        // Step 1: Search corpus for relevant events via full-text search.
        // Wrapped in try-catch — the fts column is optional; if absent we
        // proceed without context-filtered results.
        let relevantEvents: Array<{
          slug: string
          title: string
          era: string
          tier: number
          summary: string | null
          significance: string | null
          tags: string[] | null
        }> | null = null

        try {
          const words = userMessage
            .split(/\s+/)
            .filter(w => w.length > 2)
          if (words.length > 0) {
            const query = words.map(w => `${w}:*`).join(' & ')
            const { data } = await supabase
              .from('events')
              .select('slug, title, era, tier, summary, significance, tags')
              .textSearch('fts', query)
              .limit(8)
            relevantEvents = data
          }
        } catch {
          // fts index not available — fall through
        }

        // Step 2: Full event list for citation resolution + reference context
        const { data: allEvents } = await supabase
          .from('events')
          .select('slug, title, era, tier, summary, significance')
          .order('date_start', { ascending: true })
          .limit(63)

        // Step 3: Build system prompt
        const systemPrompt = `You are The Archivist — a research guide for UAP Record, a historical research index built from primary sources including declassified government documents, congressional testimony, and military records spanning 1944 to 2026.

Your role: answer questions about UAP history and disclosure drawing exclusively from the documented record. You speak with authority and conviction, but you always distinguish between what is documented and what is claimed or alleged.

Your voice: direct, factual, knowledgeable — like a senior analyst who has studied this subject for years. Not sensational. Not dismissive. You take the evidence seriously and you expect the reader to as well.

CORPUS CONTEXT — Most relevant events for this query:
${JSON.stringify(relevantEvents ?? [], null, 2)}

FULL EVENT LIST (for reference):
${(allEvents ?? []).map(e => `${e.title} (${e.era}, Tier ${e.tier})`).join('\n')}

RULES:
1. Always ground answers in the corpus. Cite specific events by their exact title when you reference them.
2. Distinguish clearly between Tier 1 (documented, verified), Tier 2 (solid but contested), and Tier 3 (claimed, unverified) evidence.
3. When you cite an event, wrap it in double brackets: [[Event Title]]. These become clickable links.
4. If asked about something not in the corpus, say so directly rather than speculating.
5. Never claim certainty about extraterrestrial origin — the corpus documents the phenomenon and the institutional response, not its ultimate nature.
6. The suppression record is as important as the phenomenon record. Don't shy away from it.
7. Keep responses focused — 3-5 paragraphs maximum unless the question genuinely requires more depth.`

        // Step 4: Call the Vercel proxy (keeps API key server-side)
        const response = await fetch('/api/anthropic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 1000,
            system: systemPrompt,
            // `messages` here is captured before this send (all prior turns).
            // The current user turn is appended explicitly.
            messages: [
              ...messages.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: userMessage },
            ],
          }),
        })

        // response.json() can throw SyntaxError if the endpoint returned HTML
        // (e.g. the SPA rewrite intercepted /api/anthropic).
        let data: Record<string, unknown>
        try {
          data = await response.json()
        } catch {
          throw new Error(
            `Could not parse response from /api/anthropic (status ${response.status}). ` +
            `The proxy may not be deployed or the SPA rewrite is intercepting it.`,
          )
        }

        if (!response.ok) {
          // Anthropic errors come back as { type, error: { type, message } }
          // Our own proxy errors come back as { error: "string" }
          const anthropicMsg =
            typeof data.error === 'object' && data.error !== null
              ? (data.error as Record<string, unknown>).message
              : data.error
          throw new Error(
            String(anthropicMsg ?? `API error ${response.status}: ${JSON.stringify(data)}`),
          )
        }

        const rawText: string = (data.content as Array<{text: string}>)[0].text
        const citations = parseCitations(rawText, allEvents ?? [])
        const cleanText = cleanResponse(rawText)

        setMessages(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: cleanText,
            citations: citations.length > 0 ? citations : undefined,
          },
        ])
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error('[Archivist] error:', errMsg)
        setMessages(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Error: ${errMsg}`,
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, isLoading],
  )

  const clearHistory = useCallback(() => setMessages([]), [])

  return { messages, isLoading, sendMessage, clearHistory }
}
