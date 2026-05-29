import { useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Clock, Map, GitFork, Search, Info, GraduationCap, Globe, Network, BookOpen, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEvents } from '@/hooks/useEvents'
import { COLLECTIONS } from '@/lib/constants'
import type { Event } from '@/lib/types'
import WelcomeModal from '@/components/WelcomeModal'
import Archivist from '@/components/Archivist'

const navItems = [
  { to: '/', label: 'Timeline', icon: Clock, end: true },
  { to: '/map', label: 'Map', icon: Map, end: false },
  { to: '/graph', label: 'Graph', icon: GitFork, end: false },
  { to: '/learn', label: 'Learn', icon: GraduationCap, end: false },
  { to: '/search', label: 'Search', icon: Search, end: false },
]

const mobileNavItems = [
  { to: '/', label: 'Timeline', icon: Clock, end: true },
  { to: '/map', label: 'Map', icon: Globe, end: false },
  { to: '/graph', label: 'Graph', icon: Network, end: false },
  { to: '/learn', label: 'Learn', icon: BookOpen, end: false },
  { to: '/search', label: 'Search', icon: Search, end: false },
]

function matchesCollection(e: Event, id: string): boolean {
  const col = COLLECTIONS.find(c => c.id === id)
  if (!col) return false
  const f = col.filter
  if (f.kind === 'tier') return e.tier === f.value
  if (f.kind === 'wave') return e.wave === f.value
  if (f.kind === 'tag') return e.tags?.includes(f.value) ?? false
  return false
}

export default function App() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const activeCollection = searchParams.get('collection')
  const [archivistOpen, setArchivistOpen] = useState(false)
  const location = useLocation()
  const isGraph = location.pathname === '/graph'

  // Full event list for counting — cached, shares query key with Timeline's unfiltered call
  const { data: allEvents = [] } = useEvents()

  const collectionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const col of COLLECTIONS) {
      counts[col.id] = allEvents.filter(e => matchesCollection(e, col.id)).length
    }
    return counts
  }, [allEvents])

  const handleCollection = (id: string) => {
    if (activeCollection === id) {
      // Deselect — go back to all events
      navigate('/', { replace: true })
    } else {
      navigate(`/?collection=${id}`)
    }
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-gray-100 overflow-hidden">
      <WelcomeModal />

      {/* Mobile header — only on small screens */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-10 bg-[#0a0a0f] border-b border-white/10 flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-mono tracking-[0.2em] text-white/40 uppercase">UAP RECORD</span>
      </div>

      {/* Sidebar — hidden on mobile */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-[#111111] border-r border-white/[0.06]">
        {/* Logo */}
        <div className="px-5 py-[18px] border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 36 36"
              className="w-7 h-7 flex-shrink-0"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="18" cy="18" r="15.5" stroke="white" strokeOpacity="0.15" strokeWidth="0.75" />
              <circle cx="18" cy="18" r="9.5" stroke="white" strokeOpacity="0.35" strokeWidth="0.75" />
              <circle cx="18" cy="18" r="3.5" fill="white" fillOpacity="0.65" />
            </svg>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold tracking-[0.18em] text-white/75 uppercase font-mono">
                Corpus
              </span>
              <span className="text-[9px] tracking-wide text-white/25 font-mono">
                UAP research index
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-2 py-3 space-y-0.5 border-b border-white/[0.06]">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-[7px] rounded text-[11px] font-mono tracking-wide transition-colors',
                  isActive
                    ? 'bg-white/[0.08] text-white/85'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]',
                )
              }
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Collections */}
        <div className="flex-1 px-2 py-3 overflow-y-auto">
          <div className="px-1 mb-2 text-[9px] font-mono tracking-[0.14em] text-white/20 uppercase">
            Collections
          </div>
          <div className="space-y-0.5">
            {COLLECTIONS.map(col => {
              const isActive = activeCollection === col.id
              const count = collectionCounts[col.id] ?? 0
              return (
                <button
                  key={col.id}
                  onClick={() => handleCollection(col.id)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-[6px] rounded text-[11px] font-mono tracking-wide transition-colors text-left',
                    isActive
                      ? 'bg-white/[0.08] text-white/85'
                      : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]',
                  )}
                >
                  <span className="truncate">{col.label}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        'text-[9px] tabular-nums flex-shrink-0 transition-colors',
                        isActive ? 'text-white/45' : 'text-white/18',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* About link */}
        <div className="px-2 pb-1 pt-2 border-t border-white/[0.06]">
          <NavLink
            to="/about"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-[7px] rounded text-[11px] font-mono tracking-wide transition-colors',
                isActive
                  ? 'bg-white/[0.08] text-white/85'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]',
              )
            }
          >
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            About
          </NavLink>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06]">
          <dl className="space-y-1">
            {[
              ['VERSION', '0.1.0'],
              ['INDEXED', '—'],
              ['LAST SYNC', '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center">
                <dt className="text-[9px] font-mono text-white/15">{k}</dt>
                <dd className="text-[9px] font-mono text-white/25">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col pt-10 md:pt-0 pb-14 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav — only on small screens */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0f] border-t border-white/10 h-14 flex items-center">
        {mobileNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors',
                isActive ? 'text-emerald-400' : 'text-white/30',
              )
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-mono tracking-wide">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── The Archivist ─────────────────────────────────────── */}

      {/* Floating trigger button — hidden while drawer is open, sits above
          the mobile bottom nav (bottom-20 = 80px > nav height 56px) */}
      {!archivistOpen && (
        <button
          onClick={() => setArchivistOpen(true)}
          className={`fixed bottom-20 md:bottom-6 ${isGraph ? 'left-6' : 'right-6'} z-50 flex items-center gap-2 px-4 py-3 rounded-full text-sm font-mono tracking-wider transition-all`}
          style={{
            background: 'rgba(0,5,20,0.9)',
            border: '1px solid rgba(0,100,255,0.4)',
            color: '#94a3b8',
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,100,255,0.7)'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#cbd5e1'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,100,255,0.4)'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'
          }}
        >
          <Archive size={14} />
          THE ARCHIVIST
        </button>
      )}

      {/* Drawer — conditionally mounted; state resets fresh on each open */}
      {archivistOpen && (
        <Archivist onClose={() => setArchivistOpen(false)} />
      )}
    </div>
  )
}
