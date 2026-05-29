import React, { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useArchivist } from '@/hooks/useArchivist'
import { ERA_CONFIG } from '@/lib/constants'
import type { Era } from '@/lib/types'
import './archivist.css'

// ── Suggested questions ──────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  'What is the strongest evidence for crash retrieval programs?',
  'Explain the Robertson Panel and why it matters',
  "Why didn't I know about this before?",
  'What connects Project Sign to AARO?',
  'What has been confirmed under oath?',
  'What is the significance of the PURSUE releases?',
]

// ── Markdown renderer ─────────────────────────────────────────
// Handles: **bold**, \n\n paragraphs, -- → em dash

function renderMarkdown(text: string): React.ReactNode {
  const normalised = text.replace(/--/g, '—')
  const paragraphs = normalised.split(/\n\n+/).filter(Boolean)

  return paragraphs.map((para, pi) => {
    // Split on **bold** spans
    const parts = para.split(/(\*\*[^*]+\*\*)/)
    const content = parts.flatMap((part, ji) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return [
          <strong key={`b-${ji}`} style={{ color: '#e2e8f0', fontWeight: 600 }}>
            {part.slice(2, -2)}
          </strong>,
        ]
      }
      // Preserve single newlines as line breaks within a paragraph
      return part.split('\n').flatMap((line, li, arr) =>
        li < arr.length - 1 ? [line, <br key={`br-${ji}-${li}`} />] : [line],
      )
    })

    return (
      <p key={pi} style={{ margin: pi === 0 ? 0 : '10px 0 0', lineHeight: '1.65' }}>
        {content}
      </p>
    )
  })
}

// ── Component ─────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export default function Archivist({ onClose }: Props) {
  const { messages, isLoading, sendMessage } = useArchivist()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Pick 4 random suggested questions once on mount
  const [suggestions] = useState<string[]>(() =>
    [...SUGGESTED_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 4),
  )

  // Auto-scroll to bottom when messages or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    setInput('')
    await sendMessage(trimmed)
  }, [input, isLoading, sendMessage])

  const handleSuggestion = useCallback(
    async (q: string) => {
      if (isLoading) return
      setInput('')
      await sendMessage(q)
    },
    [isLoading, sendMessage],
  )

  const isEmpty = messages.length === 0 && !isLoading

  return (
    <>
      {/* Backdrop — click to close */}
      <div className="archivist-overlay" onClick={onClose} />

      {/* Drawer panel */}
      <div className="archivist-drawer">

        {/* ── Header ── */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.15em',
                  color: '#475569',
                }}
              >
                UAP RECORD
              </div>
              <div style={{ fontSize: '16px', color: '#e2e8f0', marginTop: '2px', fontWeight: 500 }}>
                The Archivist
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '4px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#475569',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.18)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLButtonElement).style.color = '#475569'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'
              }}
            >
              <X size={14} />
            </button>
          </div>
          <div
            style={{ fontSize: '12px', color: '#475569', marginTop: '8px', fontStyle: 'italic' }}
          >
            Answers drawn from the documented record. Sources cited.
          </div>
        </div>

        {/* ── Message area ── */}
        <div
          className="archivist-messages"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Suggested questions — only when session is empty */}
          {isEmpty && (
            <div>
              <div
                style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.14em',
                  color: '#334155',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                }}
              >
                Suggested questions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {suggestions.map(q => (
                  <button
                    key={q}
                    className="archivist-suggestion"
                    onClick={() => handleSuggestion(q)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '4px',
                      padding: '10px 14px',
                      color: '#64748b',
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      lineHeight: '1.45',
                      transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation messages */}
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: '8px',
              }}
            >
              <div
                style={{
                  maxWidth: msg.role === 'user' ? '85%' : '95%',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  lineHeight: '1.65',
                  color: '#cbd5e1',
                  ...(msg.role === 'user'
                    ? {
                        background: 'rgba(0,50,120,0.4)',
                        border: '1px solid rgba(0,100,255,0.2)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }),
                }}
              >
                {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
              </div>

              {/* Citation pills */}
              {msg.citations && msg.citations.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    maxWidth: '95%',
                  }}
                >
                  {msg.citations.map(c => {
                    const eraColor =
                      ERA_CONFIG[c.era as Era]?.color ?? '#475569'
                    return (
                      <Link
                        key={c.slug}
                        to={`/event/${c.slug}`}
                        onClick={onClose}
                        className="archivist-citation"
                        style={{
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          padding: '3px 8px',
                          borderRadius: '3px',
                          border: `1px solid ${eraColor}55`,
                          color: eraColor,
                          background: `${eraColor}18`,
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          letterSpacing: '0.03em',
                          transition: 'filter 0.15s',
                        }}
                      >
                        {c.title}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div style={{ display: 'flex', gap: '4px', padding: '12px 0' }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#3b82f6',
                    opacity: 0.6,
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Anchor for auto-scroll */}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input area ── */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}
        >
          <div style={{ position: 'relative' }}>
            <textarea
              className="archivist-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask about the record..."
              rows={2}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                padding: '10px 40px 10px 12px',
                color: '#e2e8f0',
                fontSize: '14px',
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                position: 'absolute',
                right: '10px',
                bottom: '10px',
                background: 'none',
                border: 'none',
                padding: '2px',
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                lineHeight: 0,
              }}
            >
              <Send size={14} color={input.trim() && !isLoading ? '#3b82f6' : '#334155'} />
            </button>
          </div>
          <div
            style={{
              marginTop: '8px',
              fontSize: '11px',
              color: '#334155',
              fontFamily: 'monospace',
              letterSpacing: '0.04em',
            }}
          >
            ↵ to send &nbsp;·&nbsp; shift+↵ for new line
          </div>
        </div>
      </div>
    </>
  )
}
