import { NavLink, Outlet } from 'react-router-dom'
import {
  Building2, FileSearch, Gauge, LayoutDashboard, LogOut,
  ShieldCheck, Scale, ScrollText,
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/analysis', label: 'New Analysis', icon: FileSearch },
  { to: '/claims', label: 'Claim Explorer', icon: ScrollText },
  { to: '/fairness', label: 'Fairness', icon: Scale },
  { to: '/models', label: 'Models', icon: Gauge },
  { to: '/audit', label: 'Audit Log', icon: ShieldCheck, roles: ['admin', 'reviewer'] as const },
]

export function AppLayout() {
  const { profile, role, signOut } = useAuth()

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
            X
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">XplainESG</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              Research Prototype
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon, roles }) => {
            if (roles && (!role || !roles.includes(role as never))) return null
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-800'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <p className="truncate text-sm font-medium text-slate-800">
            {profile?.full_name || profile?.email || 'User'}
          </p>
          <p className="truncate text-xs text-slate-500">{profile?.email}</p>
          <div className="mt-2 flex items-center justify-between">
            <Badge className="border-brand-200 bg-brand-50 text-brand-700">
              {role ?? 'viewer'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
