import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // ANTHROPIC_API_KEY is the runtime secret set in Vercel dashboard.
  // VITE_ANTHROPIC_API_KEY is a fallback for local dev (set in .env).
  // Vercel treats VITE_-prefixed vars as build-time only, so they are
  // not available to serverless functions at runtime.
  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.VITE_ANTHROPIC_API_KEY ?? ''

  if (!apiKey) {
    console.error('anthropic proxy: no API key found in environment')
    return res.status(500).json({ error: 'API key not configured' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(req.body),
    })

    const data = await response.json()
    res.status(response.status).json(data)
  } catch (err) {
    console.error('anthropic proxy error:', err)
    res.status(500).json({ error: 'proxy request failed' })
  }
}
