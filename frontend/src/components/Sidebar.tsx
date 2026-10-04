import { NavLink } from 'react-router-dom'
import {
  Building2, FileSearch, Gauge, LayoutDashboard, Scale, ScrollText, ShieldCheck, Sparkles,
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: Array<'admin' | 'analyst' | 'reviewer' | 'viewer'>
}

interface NavGroup { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Analyze',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/companies', label: 'Companies', icon: Building2 },
      { to: '/analysis', label: 'New Analysis', icon: FileSearch },
    ],
  },
  {
    label: 'Explore',
    items: [
      { to: '/claims', label: 'Claim Explorer', icon: ScrollText },
      { to: '/fairness', label: 'Fairness', icon: Scale },
    ],
  },
  {
    label: 'AI Governance',
    items: [
      { to: '/governance', label: 'Governance & Ethics', icon: Sparkles },
      { to: '/models', label: 'Models', icon: Gauge },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/audit', label: 'Audit Log', icon: ShieldCheck, roles: ['admin', 'reviewer'] },
    ],
  },
]

export function Sidebar() {
  const { role } = useAuth()

  return (
    <aside className="hidden w-60 shrink-0 border-r border-line bg-surface lg:flex lg:flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-line px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-700 text-xs font-bold text-white">
          X
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-ink">XplainESG</p>
          <p className="truncate text-2xs uppercase tracking-wider text-ink-faint">
            Research Prototype
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter(
            (item) => !item.roles || (role && item.roles.includes(role)),
          )
          if (visible.length === 0) return null
          return (
            <div key={group.label} className="mb-4">
              <p className="px-3 pb-1.5 text-2xs font-medium uppercase tracking-[0.09em] text-ink-faint">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visible.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-fast',
                        isActive
                          ? 'bg-brand-50 font-medium text-brand-800'
                          : 'text-ink-muted hover:bg-surface-hover hover:text-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-brand-700' : 'text-ink-faint')} />
                        <span className="truncate">{label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-line px-3 py-3">
        <div className="flex items-center gap-2 text-2xs text-ink-faint">
          <span className="h-1.5 w-1.5 rounded-full bg-eco-400" />
          <span className="font-mono">v0.1.0</span>
          <span className="ml-auto">prototype</span>
        </div>
      </div>
    </aside>
  )
}