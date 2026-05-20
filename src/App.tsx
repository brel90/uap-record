import { useMemo } from 'react'
import { NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { Clock, Map, GitFork, Search, Info, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEvents } from '@/hooks/useEvents'
import { COLLECTIONS } from '@/lib/constants'
import type { Event } from '@/lib/types'

const navItems = [
  { to: '/', label: 'Timeline', icon: Clock, end: true },
  { to: '/map', label: 'Map', icon: Map, end: false },
  { to: '/graph', label: 'Graph', icon: GitFork, end: false },
  { to: '/learn', label: 'Learn', icon: GraduationCap, end: false },
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
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-[#111111] border-r border-white/[0.06] flex flex-col">
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
      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  )
}
