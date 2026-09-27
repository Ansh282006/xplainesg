import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Filter } from 'lucide-react'

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
  matched_keywords?: string[]
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

export function ClaimExplorer() {
  const [params, setParams] = useSearchParams()
  const initialReport = params.get('report') ?? ''
  const [reportId, setReportId] = useState(initialReport)
  const [category, setCategory] = useState<string>('')

  const companies = useQuery({
    queryKey: ['companies-list'],
    queryFn: () => api.get<{ items: CompanyOverview[] }>('/companies?limit=200'),
  })

  const reports = useQuery({
    queryKey: ['all-reports'],
    queryFn: () => api.get<{ items: ReportRow[] }>('/reports?limit=200'),
  })

  const claims = useQuery({
    queryKey: ['claims', reportId, category],
    queryFn: () => {
      const qs = new URLSearchParams()
      if (category) qs.set('category', category)
      qs.set('limit', '500')
      return api.get<{ items: Claim[]; total: number }>(
        `/reports/${reportId}/claims?${qs.toString()}`,
      )
    },
    enabled: !!reportId,
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Claim explorer</h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse extracted ESG claims. Filter by report and category.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
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
              <option value="">— Choose a report —</option>
              {reports.data?.items?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.report_title} (FY{r.report_year})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <div className="mt-1 flex gap-2">
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
                  {cat === '' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
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
            {claims.data.total} claims · showing up to 500
          </p>
          <div className="space-y-2">
            {claims.data.items.map((c) => (
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
                    <span className="ml-auto text-xs text-slate-500">
                      strength {c.claim_strength.toFixed(2)}
                    </span>
                  )}
                  {c.evidence_available && (
                    <Badge className="border-eco-200 bg-eco-50 text-eco-700">has numbers</Badge>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-slate-800">{c.sentence}</p>
              </Card>
            ))}
            {claims.data.items.length === 0 && (
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
