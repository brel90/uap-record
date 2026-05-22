import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const ERA_GREEN = '#0d6e4a'

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 10,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.22)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      paddingBottom: 8,
      marginBottom: 20,
      marginTop: 52,
    }}>
      {children}
    </div>
  )
}

function TierLabel({ tier, children }: { tier: 1 | 2 | 3; children: React.ReactNode }) {
  const dot: React.CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: '50%',
    border: `1.5px solid ${tier === 3 ? 'rgba(13,110,74,0.3)' : ERA_GREEN}`,
    background: tier === 1 ? ERA_GREEN : 'transparent',
    display: 'inline-block',
    flexShrink: 0,
    marginRight: 10,
    verticalAlign: 'middle',
    position: 'relative',
    top: -1,
  }
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 14 }}>
      <span style={{ marginTop: 5 }}>
        <span style={dot} />
      </span>
      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.7 }}>
        {children}
      </span>
    </li>
  )
}

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <div className="tl-root">
      {/* Topbar */}
      <div className="tl-topbar">
        <Link to="/" className="tl-topbar-link">Corpus</Link>
        <span className="tl-topbar-sep">/</span>
        <span className="tl-topbar-active">About</span>
      </div>

      {/* Scrollable content */}
      <div className="tl-content">
        <div style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: '72px 32px 96px',
          fontFamily: 'IBM Plex Sans, sans-serif',
        }}>

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors text-sm mb-4"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>

          {/* Site header */}
          <div style={{ marginBottom: 52 }}>
            <h1 style={{
              fontSize: 36,
              fontWeight: 600,
              color: ERA_GREEN,
              letterSpacing: '-0.02em',
              margin: '0 0 10px',
              fontFamily: 'IBM Plex Sans, sans-serif',
            }}>
              UAP Record
            </h1>
            <p style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.3)',
              fontFamily: 'IBM Plex Mono, monospace',
              letterSpacing: '0.04em',
            }}>
              A historical research index for the UAP phenomenon
            </p>
          </div>

          {/* About this project */}
          <SectionHeading>About this project</SectionHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, lineHeight: 1.75 }}>
              If you're here because of the recent government file releases, or because the topic has started feeling less dismissible than it used to — that instinct is correct. You're not late. You're arriving at exactly the right moment.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, lineHeight: 1.75 }}>
              UAP Record is a structured research index built to help people understand the UAP phenomenon the way it actually deserves to be understood: through primary sources, documented history, and verified evidence. Every event in this index is sourced. Every claim is graded by evidentiary quality. The connections between events are mapped so you can see not just what happened, but how one thing led to another across eight decades.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, lineHeight: 1.75 }}>
              This project has been in development since long before disclosure became a mainstream conversation. It was built by someone who started with the documents — declassified government records, military investigation files, congressional testimony — and found that the evidence was never really hidden. It was just never organized in a way that made the full picture visible.
            </p>
          </div>

          {/* Why this exists */}
          <SectionHeading>Why this exists</SectionHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, lineHeight: 1.75 }}>
              There is a reason you may not have believed any of this before. There is a reason you may have called others who believed it crazy. That reason is documented in this index.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, lineHeight: 1.75 }}>
              Starting in 1953, the CIA convened a panel that explicitly recommended a public debunking campaign to reduce interest in UAP reports. The US Air Force issued regulations requiring military witnesses to report sightings only through classified channels. Scientists were tasked with providing mundane explanations to the press regardless of what investigations actually found. Civilian research organizations were monitored and, evidence suggests, infiltrated.
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 15,
              lineHeight: 1.75,
              fontStyle: 'italic',
              borderLeft: `2px solid ${ERA_GREEN}`,
              paddingLeft: 20,
              marginLeft: 0,
            }}>
              This was not paranoia. It was policy. It is in the declassified records.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, lineHeight: 1.75 }}>
              The people who stayed interested in this subject despite the stigma were not credulous. They were pattern-recognizing. Across thousands of independent accounts — from military pilots, radar operators, civilian witnesses, and eventually sitting members of Congress — the same phenomena kept appearing. The same institutional responses kept following. Anyone paying close attention to the primary sources could see that the official position and the actual evidence were not the same thing.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, lineHeight: 1.75 }}>
              That gap is now closing in public. UAP Record exists to help you understand the full history of how we got here — and where the evidence points next.
            </p>
          </div>

          {/* How to use this index */}
          <SectionHeading>How to use this index</SectionHeading>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Timeline', to: '/', desc: 'Browse all 59 documented events in chronological order, from the first wartime sightings in 1944 through the PURSUE file releases of 2026. Filter by era, evidence tier, or collection.' },
              { label: 'Map', to: '/map', desc: 'See where events occurred geographically. Most of the historical record is concentrated in the United States, but the phenomenon is global.' },
              { label: 'Graph', to: '/graph', desc: 'Explore the connections between events as a navigable 3D network. The suppression thread and the phenomenon thread are both visible here — and so is how they intersect.' },
              { label: 'Search', to: '/search', desc: 'Find events, people, organizations, and programs across the full corpus.' },
            ].map(({ label, to, desc }) => (
              <div key={label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <Link
                  to={to}
                  style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 11,
                    color: ERA_GREEN,
                    textDecoration: 'none',
                    letterSpacing: '0.06em',
                    flexShrink: 0,
                    paddingTop: 3,
                    width: 68,
                  }}
                >
                  {label} →
                </Link>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>

          {/* Evidence tiers */}
          <SectionHeading>Evidence tiers</SectionHeading>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
            Every event in UAP Record is graded on a three-tier evidence scale:
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <TierLabel tier={1}>
              <strong style={{ color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>Tier 1</strong>
              {' '}— Multiple credible witnesses, sensor data, official documentation, or sworn congressional testimony. These cases hold up to scrutiny.
            </TierLabel>
            <TierLabel tier={2}>
              <strong style={{ color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>Tier 2</strong>
              {' '}— Solid witness accounts with some documentation, but missing full corroboration or with contested elements.
            </TierLabel>
            <TierLabel tier={3}>
              <strong style={{ color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>Tier 3</strong>
              {' '}— Significant but unverified. Single source, contested provenance, or heavily disputed. Included because the claims are historically consequential — but flagged accordingly.
            </TierLabel>
          </ul>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.7, marginTop: 16 }}>
            The tier system exists because intellectual honesty requires distinguishing between what is documented and what is claimed. This index takes the phenomenon seriously. That is precisely why it holds the evidence to a standard.
          </p>

          {/* Contact */}
          <SectionHeading>Contact</SectionHeading>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.7, marginBottom: 10 }}>
            Questions, corrections, or source contributions welcome.
          </p>
          <a
            href="mailto:uapindexicord@gmail.com"
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 13,
              color: ERA_GREEN,
              textDecoration: 'none',
              letterSpacing: '0.02em',
            }}
          >
            uapindexicord@gmail.com
          </a>

          {/* Note on sources */}
          <div style={{
            marginTop: 64,
            paddingTop: 28,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <p style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 12.5,
              lineHeight: 1.75,
              marginBottom: 10,
              fontStyle: 'italic',
            }}>
              Where primary sources exist — declassified government documents, congressional records, court filings, official military reports — they are cited directly. Secondary sources are used where primaries are unavailable or incomplete. The index is updated as new materials are released. PURSUE Tranche 2 dropped today, May 22, 2026; Tranche 3 is already in processing.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, lineHeight: 1.6, fontStyle: 'italic' }}>
              This is a living document. The record is still being written.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
