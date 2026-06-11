import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Readable } from 'node:stream'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Allow up to 60 s on Vercel Pro / 10 s on Hobby (set to your plan's max).
export const config = { maxDuration: 60 }

// IP-based rate limiter backed by Upstash Redis.
// Sliding window: max 15 requests per hour per IP.
//
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
// For local dev these live in .env.local; they MUST also be added to the
// Vercel project's environment variables (Settings -> Environment Variables)
// before deploying, or every request will fail at runtime.
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(15, '1 h'),
  prefix: 'ratelimit:anthropic',
})

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded
  // x-forwarded-for may be a comma-separated list; the client IP is first.
  return first?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // Rate limit check: 15 requests/hour per IP (sliding window).
  const { success } = await ratelimit.limit(getClientIp(req))
  if (!success) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' })
  }

  // ANTHROPIC_API_KEY is the runtime secret set in Vercel dashboard.
  // VITE_ANTHROPIC_API_KEY is a fallback for local dev (set in .env).
  // Vercel treats VITE_-prefixed vars as build-time only, so they are
  // not available to serverless functions at runtime.
  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.VITE_ANTHROPIC_API_KEY ?? ''

  if (!apiKey) {
    console.error('anthropic proxy: no API key found in environment')
    return res.status(500).json({ error: 'API key not configured' })
  }

  // Force streaming so Vercel starts flushing immediately instead of waiting
  // for the full response (which can exceed the function timeout).
  const body = { ...req.body, stream: true }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
    })

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text()
      return res.status(upstream.status).json({ error: text })
    }

    res.status(200)
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // Pipe the Web ReadableStream → Node Readable → Vercel response
    Readable.fromWeb(upstream.body as import('stream/web').ReadableStream).pipe(res)
  } catch (err) {
    console.error('anthropic proxy error:', err)
    res.status(500).json({ error: 'proxy request failed' })
  }
}
