import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const STORAGE_KEY = 'uap_record_welcomed'

// ── Option card ────────────────────────────────────────────

interface OptionCardProps {
  borderColor: string
  hoverBorderColor: string
  label: string
  title: string
  description: string
  buttonLabel: string
  buttonColor: string
  onClick: () => void
}

function OptionCard({
  borderColor,
  hoverBorderColor,
  label,
  title,
  description,
  buttonLabel,
  buttonColor,
  onClick,
}: OptionCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1px solid ${hovered ? hoverBorderColor : borderColor}`,
        borderRadius: 3,
        padding: '20px 24px',
        transition: 'border-color 0.18s ease',
        cursor: 'pointer',
      }}
      onClick={onClick}
    >
      <div
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 9,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.88)',
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <p
        style={{
          fontSize: 13,
          color: '#94a3b8',
          lineHeight: 1.65,
          margin: '0 0 16px',
        }}
      >
        {description}
      </p>
      <div
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 12,
          color: buttonColor,
          letterSpacing: '0.03em',
        }}
      >
        {buttonLabel}
      </div>
    </div>
  )
}

// ── Modal ──────────────────────────────────────────────────

export default function WelcomeModal() {
  const [visible] = useState(() => !localStorage.getItem(STORAGE_KEY))
  const navigate = useNavigate()

  if (!visible) return null

  const dismiss = (to: string) => {
    localStorage.setItem(STORAGE_KEY, 'true')
    navigate(to)
    // Force re-render by reloading? No — just let the parent
    // re-render naturally. We keep visible as initialised state;
    // the component will unmount once the route changes.
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: 560,
          width: '100%',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          background: 'rgba(0,5,20,0.95)',
          border: '1px solid rgba(0,100,255,0.2)',
          backdropFilter: 'blur(12px)',
          padding: '36px 40px',
          borderRadius: 4,
          flexShrink: 0,
        }}
      >
        {/* Top — centered */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.22)',
              marginBottom: 16,
            }}
          >
            UAP Record
          </div>

          <p
            style={{
              color: '#cbd5e1',
              fontStyle: 'italic',
              lineHeight: 1.9,
              fontSize: 15,
              margin: '0 0 28px',
            }}
          >
            The history of the UAP phenomenon is documented.
            <br />
            Not theorized. Not speculated. Documented —
            <br />
            in declassified government files, congressional
            <br />
            testimony, and military records spanning 80 years.
            <br />
            <br />
            Most people never saw it. That wasn't an accident.
          </p>

          <hr
            style={{
              border: 'none',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              margin: '0 0 28px',
            }}
          />
        </div>

        {/* Option cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <OptionCard
            borderColor="rgba(16,185,129,0.3)"
            hoverBorderColor="rgba(16,185,129,0.6)"
            label="New to the subject"
            title="Start with the Learn Modules"
            description="Three guided modules walk you through the institutional story, why you didn't know about this, and how the silence finally broke. About 15 minutes each."
            buttonLabel="Begin Here →"
            buttonColor="#10b981"
            onClick={() => dismiss('/learn')}
          />

          <OptionCard
            borderColor="rgba(0,100,255,0.2)"
            hoverBorderColor="rgba(0,100,255,0.4)"
            label="Returning or familiar"
            title="Go Straight to the Record"
            description="61 events. 107 entities. 102 documented connections. Browse the full timeline from 1944 to today."
            buttonLabel="Enter the Timeline →"
            buttonColor="#6090ff"
            onClick={() => dismiss('/')}
          />
        </div>
      </div>
    </div>
  )
}
