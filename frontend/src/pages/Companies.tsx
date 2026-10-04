import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Building2, Search, SortAsc, SortDesc } from 'lucide-react'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn, formatDate, formatScore, riskTone } from '@/lib/utils'
import type { CompanyOverview } from '@/types'

interface Page { items: CompanyOverview[]; total: number }

type SortKey = 'name' | 'sector' | 'risk' | 'last_analysed'

function ratingFor(c: CompanyOverview): number | null {
  if (c.esg_trust_score != null) return c.esg_trust_score
  return null
}

export function Companies() {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDesc, setSortDesc] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get<Page>('/companies?limit=200'),
  })

  const filtered = useMemo(() => {
    let rows = data?.items ?? []
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter((c) => {
        const haystack = `${c.name} ${c.ticker ?? ''} ${c.sector ?? ''} ${c.country ?? ''}`.toLowerCase()
        return haystack.includes(q)
      })
    }
    const sorted = [...rows]
    sorted.sort((a, b) => {
      let av: any, bv: any
      if (sortKey === 'name') { av = a.name?.toLowerCase() ?? ''; bv = b.name?.toLowerCase() ?? '' }
      else if (sortKey === 'sector') { av = a.sector ?? ''; bv = b.sector ?? '' }
      else if (sortKey === 'risk') {
        const map = { LOW: 1, MEDIUM: 2, HIGH: 3 } as Record<string, number>
        av = a.greenwashing_risk ? map[a.greenwashing_risk] : 0
        bv = b.greenwashing_risk ? map[b.greenwashing_risk] : 0
      } else {
        av = a.last_analyzed_at ?? ''; bv = b.last_analyzed_at ?? ''
      }
      if (av < bv) return sortDesc ? 1 : -1
      if (av > bv) return sortDesc ? -1 : 1
      return 0
    })
    return sorted
  }, [data, search, sortKey, sortDesc])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Companies</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {data?.total ?? 0} {(data?.total ?? 0) === 1 ? 'company' : 'companies'} in the workspace.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> All companies
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-8 w-56 pl-8 text-xs"
              />
            </div>
            <div className="flex gap-1">
              {(['name', 'sector', 'risk', 'last_analysed'] as SortKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setSortKey(k)}
                  className={cn(
                    'rounded-md border px-2.5 py-1.5 text-2xs font-medium capitalize transition-colors',
                    sortKey === k
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-line-strong bg-surface text-ink-muted hover:bg-surface-hover',
                  )}
                >
                  {k.replace('_', ' ')}
                </button>
              ))}
              <button
                onClick={() => setSortDesc(!sortDesc)}
                className="rounded-md border border-line-strong bg-surface px-2 text-ink-muted hover:bg-surface-hover"
                title={sortDesc ? 'Descending' : 'Ascending'}
              >
                {sortDesc ? <SortDesc className="h-3.5 w-3.5" /> : <SortAsc className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-5"><SkeletonTable rows={5} cols={6} /></div>
          ) : error ? (
            <EmptyState
              icon={<Building2 className="h-5 w-5" />}
              title="Could not load companies"
              description={error instanceof Error ? error.message : 'Backend unreachable'}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-5 w-5" />}
              title={search ? `No companies match "${search}"` : 'No companies yet'}
              description={search ? 'Try a different search term.' : 'Create a company via the ingestion script.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line-subtle text-left">
                  <tr className="text-2xs uppercase tracking-wider text-ink-faint">
                    <th className="px-5 py-3 font-medium">Company</th>
                    <th className="px-5 py-3 font-medium">Sector</th>
                    <th className="px-5 py-3 font-medium">Country</th>
                    <th className="px-5 py-3 font-medium">Risk</th>
                    <th className="px-5 py-3 text-right font-medium">Rating</th>
                    <th className="px-5 py-3 text-right font-medium">Last analysed</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const rating = ratingFor(c)
                    return (
                      <tr key={c.id} className="group row-hover border-b border-line-subtle last:border-0">
                        <td className="px-5 py-3">
                          <Link
                            to={`/companies/${c.id}`}
                            className="font-medium text-ink hover:text-brand-700"
                          >
                            {c.name}
                          </Link>
                          {c.ticker && (
                            <span className="ml-2 font-mono text-xs text-ink-faint">{c.ticker}</span>
                          )}
                          {c.is_demo && (
                            <Badge className="ml-2 border-amber-200 bg-amber-50 text-amber-700">
                              DEMO
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-3 text-ink-muted">{c.sector ?? '—'}</td>
                        <td className="px-5 py-3 text-ink-muted">{c.country ?? '—'}</td>
                        <td className="px-5 py-3">
                          {c.greenwashing_risk ? (
                            <Badge className={riskTone(c.greenwashing_risk)}>{c.greenwashing_risk}</Badge>
                          ) : (
                            <span className="text-ink-faint">Not analysed</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-ink-muted">
                          {rating !== null ? rating.toFixed(2) : '—'}
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-ink-faint">
                          {formatDate(c.last_analyzed_at)}
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            to={`/companies/${c.id}`}
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            title="View details"
                          >
                            <ArrowRight className="h-4 w-4 text-brand-600" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
