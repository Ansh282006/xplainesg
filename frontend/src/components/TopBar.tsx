import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, HelpCircle, LogOut, Search, Settings, User } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs'
import { cn } from '@/lib/utils'

interface Props {
  onOpenCommandPalette?: () => void
}

export function TopBar({ onOpenCommandPalette }: Props = {}) {
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()
  const crumbs = useBreadcrumbs()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const initials = (profile?.full_name || profile?.email || '?')
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur-md">
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1
          return (
            <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <span className="text-ink-faint">/</span>}
              {c.to && !last ? (
                <Link
                  to={c.to}
                  className="truncate text-ink-muted transition-colors hover:text-ink"
                >
                  {c.label}
                </Link>
              ) : (
                <span className={cn('truncate', last ? 'font-medium text-ink' : 'text-ink-muted')}>
                  {c.label}
                </span>
              )}
            </span>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={() => onOpenCommandPalette?.()}
        className="hidden h-9 w-64 items-center gap-2 rounded-md border border-line bg-surface-muted px-2.5 text-sm text-ink-faint transition-colors hover:border-line-strong hover:bg-surface-hover md:flex"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search or jump to...</span>
        <span className="kbd">Ctrl+K</span>
      </button>

      <div className="flex items-center gap-1">
        <IconButton aria-label="Help"><HelpCircle className="h-4 w-4" /></IconButton>
        <IconButton aria-label="Notifications"><Bell className="h-4 w-4" /></IconButton>

        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex h-9 items-center gap-2 rounded-md px-1.5 transition-colors hover:bg-surface-hover"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-2xs font-semibold text-white">
              {initials || '?'}
            </div>
            <ChevronDown className="h-3 w-3 text-ink-faint" />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 z-50 mt-1 w-60 origin-top-right animate-slide-up rounded-lg border border-line bg-surface p-1 shadow-lg">
                <div className="border-b border-line-subtle px-3 py-2">
                  <p className="truncate text-sm font-medium text-ink">
                    {profile?.full_name || 'Unnamed user'}
                  </p>
                  <p className="truncate text-xs text-ink-faint">{profile?.email}</p>
                  <span className="badge mt-1.5 border-brand-200 bg-brand-50 text-brand-700">
                    {role ?? 'viewer'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => { setUserMenuOpen(false); navigate('/settings') }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
                >
                  <User className="h-3.5 w-3.5" /> Profile
                </button>
                <button
                  type="button"
                  onClick={() => { setUserMenuOpen(false); navigate('/settings') }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
                >
                  <Settings className="h-3.5 w-3.5" /> Settings
                </button>
                <div className="my-1 border-t border-line-subtle" />
                <button
                  type="button"
                  onClick={() => { setUserMenuOpen(false); void signOut() }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-red-700 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function IconButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
    >
      {children}
    </button>
  )
}