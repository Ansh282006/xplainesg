import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight, Building2, FileSearch, Gauge, LayoutDashboard, LogOut,
  Scale, ScrollText, Search, Settings, ShieldCheck, Sparkles,
} from 'lucide-react'

import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import type { CompanyOverview } from '@/types'

interface CommandItem {
  id: string
  label: string
  hint?: string
  group: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
}

interface Props {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Live company data for company items
  const companiesQuery = useQuery({
    queryKey: ['cmd-companies'],
    queryFn: () => api.get<{ items: CompanyOverview[] }>('/companies?limit=200'),
    enabled: open,
  })

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      // Focus after modal renders
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [open])

  // Build command items
  const items: CommandItem[] = useMemo(() => {
    const go = (path: string) => () => {
      navigate(path)
      onClose()
    }

    const base: CommandItem[] = [
      { id: 'nav-dashboard',   label: 'Dashboard',          hint: 'Overview',          group: 'Navigation', icon: LayoutDashboard, action: go('/dashboard') },
      { id: 'nav-companies',   label: 'Companies',          hint: 'All companies',     group: 'Navigation', icon: Building2,       action: go('/companies') },
      { id: 'nav-new-analysis',label: 'New Analysis',       hint: 'Run analysis',      group: 'Navigation', icon: FileSearch,      action: go('/analysis') },
      { id: 'nav-claims',      label: 'Claim Explorer',     hint: 'Browse claims',     group: 'Navigation', icon: ScrollText,      action: go('/claims') },
      { id: 'nav-fairness',    label: 'Fairness',           hint: 'Sector / region',   group: 'Navigation', icon: Scale,           action: go('/fairness') },
      { id: 'nav-governance',  label: 'AI Governance',      hint: 'Responsible AI',    group: 'Navigation', icon: Sparkles,        action: go('/governance') },
      { id: 'nav-models',      label: 'Models',             hint: 'Registry',          group: 'Navigation', icon: Gauge,           action: go('/models') },
      { id: 'nav-audit',       label: 'Audit Log',          hint: 'Admin / reviewer',  group: 'Navigation', icon: ShieldCheck,     action: go('/audit') },
      { id: 'nav-settings',    label: 'Settings',           hint: 'Profile',           group: 'Navigation', icon: Settings,        action: go('/settings') },
    ]

    const companyItems: CommandItem[] = (companiesQuery.data?.items ?? []).map((c) => ({
      id: `company-${c.id}`,
      label: c.name,
      hint: [c.ticker, c.sector, c.country].filter(Boolean).join(' · '),
      group: 'Companies',
      icon: Building2,
      action: go(`/companies/${c.id}`),
    }))

    const actionItems: CommandItem[] = [
      {
        id: 'action-new-analysis',
        label: 'Run new analysis',
        hint: 'Upload report',
        group: 'Actions',
        icon: FileSearch,
        action: go('/analysis'),
      },
      {
        id: 'action-signout',
        label: 'Sign out',
        hint: 'End session',
        group: 'Actions',
        icon: LogOut,
        action: () => {
          void signOut()
          onClose()
        },
      },
    ]

    return [...base, ...companyItems, ...actionItems]
  }, [companiesQuery.data, navigate, onClose, signOut])

  // Filter by query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => {
      const haystack = `${item.label} ${item.hint ?? ''} ${item.group}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [items, query])

  // Clamp selection when filtered changes
  useEffect(() => {
    if (selected >= filtered.length) setSelected(0)
  }, [filtered.length, selected])

  // Keyboard handling
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected((s) => (filtered.length ? (s + 1) % filtered.length : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected((s) => (filtered.length ? (s - 1 + filtered.length) % filtered.length : 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        filtered[selected]?.action()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, filtered, selected, onClose])

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cmd-index="${selected}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  if (!open) return null

  // Group filtered items
  const grouped = new Map<string, Array<{ item: CommandItem; index: number }>>()
  filtered.forEach((item, index) => {
    if (!grouped.has(item.group)) grouped.set(item.group, [])
    grouped.get(item.group)!.push({ item, index })
  })

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl origin-top animate-slide-up overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0) }}
            placeholder="Search pages, companies, actions…"
            className="h-7 w-full border-0 bg-transparent p-0 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <span className="kbd">ESC</span>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[420px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-muted">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            Array.from(grouped.entries()).map(([group, entries]) => (
              <div key={group} className="mb-1">
                <p className="px-3 py-1.5 text-2xs font-medium uppercase tracking-[0.08em] text-ink-faint">
                  {group}
                </p>
                {entries.map(({ item, index }) => {
                  const Icon = item.icon
                  const isSelected = index === selected
                  return (
                    <button
                      key={item.id}
                      data-cmd-index={index}
                      onMouseEnter={() => setSelected(index)}
                      onClick={() => item.action()}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors duration-fast',
                        isSelected
                          ? 'bg-brand-50 text-brand-900'
                          : 'text-ink-muted hover:bg-surface-hover hover:text-ink',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isSelected ? 'text-brand-700' : 'text-ink-faint',
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                      {item.hint && (
                        <span className="truncate text-xs text-ink-faint">{item.hint}</span>
                      )}
                      {isSelected && (
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-2xs text-ink-faint">
          <span className="flex items-center gap-1">
            <span className="kbd">↑</span>
            <span className="kbd">↓</span>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <span className="kbd">↵</span>
            select
          </span>
          <span className="flex items-center gap-1">
            <span className="kbd">esc</span>
            close
          </span>
          <span className="ml-auto font-mono">⌘K</span>
        </div>
      </div>
    </div>
  )
}
