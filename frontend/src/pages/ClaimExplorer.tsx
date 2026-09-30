import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Filter, SortAsc, SortDesc } from 'lucide-react'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import type { CompanyOverview } from '@/types'

interface Claim {
  id: string
  page_number: number | null
  sentence: string
  category: 'environmental' | 'social' | 'governance' | null
  claim_type: string
  claim_strength: number | null
  evidence_available: boolean | null
  parsed_metric: string | null
  parsed_value: number | null
  parsed_claim_type: string | null
  divergence: number | null
  divergence_interpretation: string | null
  divergence_reliable: boolean
  divergence_actual: number | null
}

interface ReportRow {
  id: string
  report_title: string
  report_year: number
}

const CATEGORY_COLOUR: Record<string, string> = {
  environmental: 'border-eco-200 bg-eco-50 text-eco-700',
  social: 'border-brand-200 bg-brand-50 text-brand-700',
  governance: 'border-slate-300 bg-slate-100 text-slate-700',
}

type SortKey = 'strength' | 'divergence' | 'page'

export function ClaimExplorer() {
  const [params, setParams] = useSearchParams()
  const initialReport = params.get('report') ?? ''
  const [reportId, setReportId] = useState(initialReport)
  const [category, setCategory] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>('strength')
  const [sortDesc, setSortDesc] = useState(true)
  const [onlyHighDivergence, setOnlyHighDivergence] = useState(false)

  const reports = useQuery({
    queryKey: ['all-reports'],
    queryFn: () => api.get<{ items: ReportRow[] }>('/reports?limit=200'),
  })

  const claims = useQuery({
    queryKey: ['claims-div', reportId, category],
    queryFn: () => {
      const qs = new URLSearchParams()
      if (category) qs.set('category', category)
      qs.set('limit', '500')
      return api.get<{ items: Claim[]; total: number }>(
        `/reports/${reportId}/claims-with-divergence?${qs.toString()}`,
      )
    },
    enabled: !!reportId,
  })

  const sortedAndFiltered = useMemo(() => {
    let rows = claims.data?.items ?? []
    if (onlyHighDivergence) {
      rows = rows.filter((r) => r.divergence !== null && r.divergence >= 0.35)
    }
    const sorted = [...rows]
    sorted.sort((a, b) => {
      const av = sortKey === 'strength' ? a.claim_strength ?? 0
        : sortKey === 'divergence' ? a.divergence ?? -1
        : a.page_number ?? 0
      const bv = sortKey === 'strength' ? b.claim_strength ?? 0
        : sortKey === 'divergence' ? b.divergence ?? -1
        : b.page_number ?? 0
      return sortDesc ? bv - av : av - bv
    })
    return sorted
  }, [claims.data, sortKey, sortDesc, onlyHighDivergence])

  const categoryLabel = (cat: string) =>
    cat === '' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Claim explorer</h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse extracted ESG claims. Each claim is annotated with its divergence from the
          company&apos;s own disclosed indicators.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters &amp; sorting
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Report</label>
              <select
                value={reportId}
                onChange={(e) => {
                  setReportId(e.target.value)
                  setParams(e.target.value ? { report: e.target.value } : {})
                }}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">- Choose a report -</option>
                {reports.data?.items?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.report_title} (FY{r.report_year})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sort by</label>
              <div className="mt-1 flex gap-2">
                {(['strength', 'divergence', 'page'] as SortKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setSortKey(k)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-xs font-medium transition-colors capitalize',
                      sortKey === k
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {k}
                  </button>
                ))}
                <button
                  onClick={() => setSortDesc(!sortDesc)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-600 hover:bg-slate-50"
                  title={sortDesc ? 'Descending' : 'Ascending'}
                >
                  {sortDesc ? <SortDesc className="h-3.5 w-3.5" /> : <SortAsc className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Category</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {['', 'environmental', 'social', 'governance'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                      category === cat
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {categoryLabel(cat)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Divergence</label>
              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => setOnlyHighDivergence(false)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                    !onlyHighDivergence
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
                  )}
                >
                  All claims
                </button>
                <button
                  onClick={() => setOnlyHighDivergence(true)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1',
                    onlyHighDivergence
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
                  )}
                >
                  <AlertTriangle className="h-3 w-3" />
                  High only (≥0.35)
                </button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {!reportId && (
        <Card className="p-8 text-center">
          <p className="text-sm text-slate-500">
            Select a report above to see its extracted ESG claims.
          </p>
        </Card>
      )}

      {reportId && claims.isLoading && (
        <div className="flex h-32 items-center justify-center"><Spinner /></div>
      )}

      {reportId && claims.data && (
        <>
          <p className="text-sm text-slate-500">
            Showing {sortedAndFiltered.length} of {claims.data.total} claims
            {onlyHighDivergence && ' (filtered to high divergence)'}
          </p>
          <div className="space-y-2">
            {sortedAndFiltered.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {c.category && (
                    <Badge className={CATEGORY_COLOUR[c.category] ?? ''}>{c.category}</Badge>
                  )}
                  <Badge className="border-slate-200 bg-white text-slate-600">
                    {c.claim_type}
                  </Badge>
                  {c.page_number && (
                    <span className="text-xs text-slate-400">p.{c.page_number}</span>
                  )}
                  {c.claim_strength != null && (
                    <span className="text-xs text-slate-500">
                      strength {c.claim_strength.toFixed(2)}
                    </span>
                  )}
                  {c.evidence_available && (
                    <Badge className="border-eco-200 bg-eco-50 text-eco-700">has numbers</Badge>
                  )}
                  {c.divergence != null && (
                    <Badge
                      className={cn(
                        'ml-auto',
                        c.divergence > 0.65
                          ? 'border-red-300 bg-red-50 text-red-700'
                          : c.divergence > 0.35
                          ? 'border-amber-300 bg-amber-50 text-amber-700'
                          : 'border-eco-200 bg-eco-50 text-eco-700',
                      )}
                    >
                      divergence {c.divergence.toFixed(3)}
                    </Badge>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-slate-800">{c.sentence}</p>
                {(c.parsed_metric || c.divergence_interpretation) && (
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    {c.parsed_metric && (
                      <span>
                        metric: <span className="font-mono">{c.parsed_metric}</span>
                      </span>
                    )}
                    {c.parsed_value != null && (
                      <span>
                        claimed: <span className="font-mono">{c.parsed_value.toFixed(3)}</span>
                      </span>
                    )}
                    {c.divergence_actual != null && (
                      <span>
                        actual: <span className="font-mono">{c.divergence_actual.toFixed(3)}</span>
                      </span>
                    )}
                    {c.divergence_interpretation && (
                      <span className="italic">{c.divergence_interpretation}</span>
                    )}
                  </div>
                )}
              </Card>
            ))}
            {sortedAndFiltered.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-sm text-slate-500">No claims matched the filter.</p>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
