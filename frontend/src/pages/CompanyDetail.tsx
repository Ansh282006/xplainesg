import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Building2, FileText, Globe, PlayCircle, TrendingDown, TrendingUp,
} from 'lucide-react'
import {
  CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn, formatDate, formatScore, riskTone } from '@/lib/utils'
import type { Analysis, CompanyOverview } from '@/types'

interface ReportRow {
  id: string
  report_title: string
  report_year: number
  processing_status: string
  file_path: string | null
}

function ratingTone(r: number | null | undefined): string {
  if (r === null || r === undefined) return 'text-slate-500'
  if (r < 3) return 'text-eco-700'
  if (r < 6) return 'text-amber-700'
  return 'text-red-700'
}

function ratingBand(r: number | null | undefined): string {
  if (r === null || r === undefined) return '-'
  if (r < 3) return 'LOW'
  if (r < 6) return 'MEDIUM'
  return 'HIGH'
}

function ratingBox(r: number | null | undefined): string {
  if (r === null || r === undefined) return ''
  if (r < 3) return 'border-eco-200 bg-eco-50'
  if (r < 6) return 'border-amber-200 bg-amber-50'
  return 'border-red-200 bg-red-50'
}

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>()

  const company = useQuery({
    queryKey: ['company', id],
    queryFn: () => api.get<CompanyOverview>(`/companies/${id}`),
    enabled: !!id,
  })

  const reports = useQuery({
    queryKey: ['company-reports', id],
    queryFn: () => api.get<{ items: ReportRow[] }>(`/reports?company_id=${id}`),
    enabled: !!id,
  })

  const history = useQuery({
    queryKey: ['company-history', id],
    queryFn: () => api.get<{ items: Analysis[] }>(`/companies/${id}/history`),
    enabled: !!id,
  })

  if (company.isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner className="h-7 w-7" /></div>
  }
  if (company.error || !company.data) {
    return (
      <Card className="p-6">
        <p className="text-sm text-red-700">Company not found.</p>
        <Link to="/companies" className="mt-2 inline-block text-sm text-brand-700 hover:underline">
          Back to companies
        </Link>
      </Card>
    )
  }

  const c = company.data
  const historyItems = history.data?.items ?? []
  const latest = historyItems[0]
  const previous = historyItems[1]

  const latestRating = latest?.risk_rating ?? (latest?.greenwashing_probability != null ? latest.greenwashing_probability * 10 : null)
  const previousRating = previous?.risk_rating ?? (previous?.greenwashing_probability != null ? previous.greenwashing_probability * 10 : null)
  const delta = (latestRating !== null && previousRating !== null) ? latestRating - previousRating : null

  const ratingsArr = historyItems
    .map((h) => h.risk_rating ?? (h.greenwashing_probability != null ? h.greenwashing_probability * 10 : null))
    .filter((x): x is number => x !== null)
  const avgRating = ratingsArr.length ? ratingsArr.reduce((a, b) => a + b, 0) / ratingsArr.length : null

  const chartData = [...historyItems]
    .reverse()
    .filter((h) => h.risk_rating != null || h.greenwashing_probability != null)
    .map((h) => {
      const r = h.risk_rating ?? (h.greenwashing_probability != null ? h.greenwashing_probability * 10 : null)
      return {
        date: new Date(h.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        fullDate: new Date(h.created_at).toLocaleString(),
        rating: r,
      }
    })

  return (
    <div className="space-y-6">
      <div>
        <Link to="/companies" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Companies
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{c.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              {c.ticker && <span className="font-mono">{c.ticker}</span>}
              {c.sector && <span>&middot; {c.sector}</span>}
              {c.country && <span>&middot; {c.country}</span>}
              {c.is_demo && (
                <Badge className="border-amber-200 bg-amber-50 text-amber-700">DEMO</Badge>
              )}
            </div>
          </div>
          <Link to={`/analysis?company=${c.id}`}>
            <Button variant="eco">
              <PlayCircle className="h-4 w-4" /> Run new analysis
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className={cn('p-5 border-2', ratingBox(latestRating))}>
          <p className="label">Latest risk rating</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn('text-4xl font-semibold tabular-nums', ratingTone(latestRating))}>
              {latestRating !== null ? latestRating.toFixed(2) : '-'}
            </span>
            <span className="text-xl text-slate-400">/10</span>
            <span className={cn('ml-1 text-xs font-medium uppercase tracking-wide', ratingTone(latestRating))}>
              {ratingBand(latestRating)}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-slate-600">
            {delta !== null ? (
              <>
                {delta < 0 ? (
                  <TrendingDown className="h-3 w-3 text-eco-700" />
                ) : delta > 0 ? (
                  <TrendingUp className="h-3 w-3 text-red-700" />
                ) : null}
                <span className={cn('font-mono', delta < 0 ? 'text-eco-700' : delta > 0 ? 'text-red-700' : 'text-slate-500')}>
                  {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                </span>
                <span className="text-slate-400">vs previous</span>
              </>
            ) : (
              <span className="text-slate-400">No prior analysis</span>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="label">Claim credibility</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
            {formatScore(latest?.claim_credibility_score)}
          </p>
          <p className="mt-2 text-xs text-slate-500">From most recent analysis</p>
        </Card>

        <Card className="p-5">
          <p className="label">Average rating</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
            {avgRating !== null ? avgRating.toFixed(2) : '-'}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Across {ratingsArr.length} {ratingsArr.length === 1 ? 'analysis' : 'analyses'}
          </p>
        </Card>
      </div>

      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Risk rating over time</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: 10, right: 20, top: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <ReferenceArea y1={0} y2={3} fill="#1f9765" fillOpacity={0.06} />
                  <ReferenceArea y1={3} y2={6} fill="#c88a12" fillOpacity={0.06} />
                  <ReferenceArea y1={6} y2={10} fill="#c0392b" fillOpacity={0.06} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    domain={[0, 10]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const p = payload[0].payload as { fullDate: string; rating: number | null }
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                          <p className="text-slate-500">{p.fullDate}</p>
                          <p className="mt-1 font-semibold text-slate-900">
                            Rating: {p.rating !== null ? p.rating.toFixed(2) : '-'}
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rating"
                    stroke="#2b74a8"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#2b74a8' }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              Background bands:{' '}
              <span className="font-mono text-eco-700">LOW (0-3)</span>,{' '}
              <span className="font-mono text-amber-700">MEDIUM (3-6)</span>,{' '}
              <span className="font-mono text-red-700">HIGH (6-10)</span>
            </p>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Reports
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {reports.isLoading ? (
              <div className="flex h-24 items-center justify-center"><Spinner /></div>
            ) : reports.data?.items?.length ? (
              <ul className="divide-y divide-slate-100">
                {reports.data.items.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{r.report_title}</p>
                      <p className="text-xs text-slate-500">
                        FY{r.report_year} &middot; {r.processing_status}
                      </p>
                    </div>
                    <Link to={`/claims?report=${r.id}`} className="text-xs text-brand-700 hover:underline">
                      View claims
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-slate-500">No reports yet.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Analysis history
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {history.isLoading ? (
              <div className="flex h-24 items-center justify-center"><Spinner /></div>
            ) : historyItems.length ? (
              <ul className="divide-y divide-slate-100">
                {historyItems.slice(0, 8).map((a) => {
                  const r = a.risk_rating ?? (a.greenwashing_probability != null ? a.greenwashing_probability * 10 : null)
                  return (
                    <li key={a.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {a.model_version ?? 'model'} &middot; {a.status}
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(a.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <span className="text-xs text-slate-500">
                          cred {formatScore(a.claim_credibility_score)}
                        </span>
                        <span className={cn('font-mono text-sm font-semibold tabular-nums', ratingTone(r))}>
                          {r !== null ? r.toFixed(2) : '-'}
                        </span>
                        {a.greenwashing_risk && (
                          <Badge className={riskTone(a.greenwashing_risk)}>{a.greenwashing_risk}</Badge>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-slate-500">No analyses yet.</p>
            )}
          </CardBody>
        </Card>
      </div>

      {(c.website || c.description) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4" /> Overview
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {c.description && <p className="text-sm text-slate-700">{c.description}</p>}
            {c.website && (
              <a
                href={c.website}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-brand-700 hover:underline"
              >
                {c.website}
              </a>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
