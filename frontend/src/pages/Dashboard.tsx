import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Building2, FileText, Gauge, ShieldAlert,
} from 'lucide-react'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { cn, formatDate, formatScore, riskTone } from '@/lib/utils'
import type { DashboardStats } from '@/types'

const RISK_COLOURS: Record<string, string> = {
  LOW: '#1f9765',
  MEDIUM: '#c88a12',
  HIGH: '#c0392b',
}

interface RecentAnalysis {
  id: string
  company_id: string
  company_name: string | null
  ticker: string | null
  sector: string | null
  model_version: string | null
  esg_trust_score: number | null
  claim_credibility_score: number | null
  greenwashing_risk: 'LOW' | 'MEDIUM' | 'HIGH' | null
  greenwashing_probability: number | null
  risk_rating: number | null
  status: string
  created_at: string
}

function ratingTone(r: number | null | undefined): string {
  if (r === null || r === undefined) return 'text-ink-faint'
  if (r < 3) return 'text-eco-700'
  if (r < 6) return 'text-amber-700'
  return 'text-red-700'
}

function bandTone(r: number | null | undefined): string {
  if (r === null || r === undefined) return 'border-line bg-surface-muted text-ink-faint'
  if (r < 3) return 'border-eco-200 bg-eco-50 text-eco-700'
  if (r < 6) return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-red-200 bg-red-50 text-red-700'
}

function bandLabel(r: number | null | undefined): string {
  if (r === null || r === undefined) return '—'
  if (r < 3) return 'LOW'
  if (r < 6) return 'MEDIUM'
  return 'HIGH'
}

function KpiCard({
  label, value, hint, icon, trend,
}: {
  label: string
  value: string | number
  hint?: string
  icon?: React.ReactNode
  trend?: { value: number; goodWhenNegative?: boolean }
}) {
  const trendGood = trend ? (trend.goodWhenNegative ? trend.value < 0 : trend.value > 0) : null
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="label">{label}</p>
        {icon && <span className="text-brand-500">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
        {trend && (
          <span className={cn(
            'flex items-center gap-0.5 text-xs font-medium',
            trendGood ? 'text-eco-700' : 'text-red-700',
          )}>
            {trend.value > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </Card>
  )
}

export function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
  })

  const recent = useQuery({
    queryKey: ['dashboard-recent'],
    queryFn: () => api.get<{ items: RecentAnalysis[]; total: number }>(
      '/dashboard/recent-analyses?limit=8',
    ),
  })

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner className="h-7 w-7" /></div>
  }
  if (error || !data) {
    return <Card className="p-6"><p className="text-sm text-red-700">Could not load dashboard.</p></Card>
  }

  const riskData = ['LOW', 'MEDIUM', 'HIGH'].map((level) => ({
    level, count: data.risk_distribution[level] ?? 0,
  }))
  const sectorData = (data.sector_distribution || []).slice(0, 8)
  const recentItems = recent.data?.items ?? []

  // Compute an average rating across recent analyses (fallback for hero KPI)
  const avgRating = recentItems.length
    ? recentItems.reduce((sum, r) => sum + (r.risk_rating ?? (r.greenwashing_probability ?? 0) * 10), 0) / recentItems.length
    : null

  // Trend: current week vs previous week (mock — refine later)
  const trendWindow = recentItems.slice(0, 4).map((r) => ({
    date: new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    rating: r.risk_rating ?? ((r.greenwashing_probability ?? 0) * 10),
  })).reverse()

  return (
    <div className="space-y-6 stagger">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Aggregate view across all analysed companies. Values are computed from stored
            analyses.
          </p>
        </div>
        <Link
          to="/analysis"
          className="flex items-center gap-1 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-brand-800"
        >
          Run new analysis <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Companies tracked"
          value={data.total_companies}
          icon={<Building2 className="h-4 w-4" />}
          hint="Total in workspace"
        />
        <KpiCard
          label="Reports ingested"
          value={data.total_reports}
          icon={<FileText className="h-4 w-4" />}
          hint="PDFs analysed"
        />
        <KpiCard
          label="ESG claims"
          value={data.total_claims.toLocaleString()}
          icon={<Gauge className="h-4 w-4" />}
          hint="Extracted from reports"
        />
        <KpiCard
          label="Pending reviews"
          value={data.pending_reviews}
          icon={<ShieldAlert className="h-4 w-4" />}
          hint="Awaiting human sign-off"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Hero rating card */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Portfolio greenwashing risk</CardTitle></CardHeader>
          <CardBody>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-5xl font-semibold tabular-nums tracking-tight', ratingTone(avgRating))}>
                {avgRating !== null ? avgRating.toFixed(2) : '—'}
              </span>
              <span className="text-2xl text-ink-faint">/10</span>
              <span className={cn('badge ml-2', bandTone(avgRating))}>{bandLabel(avgRating)}</span>
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Average across most recent analyses. Decomposes to claim vagueness,
              claim-indicator divergence, and indicator weakness.
            </p>

            {trendWindow.length > 1 && (
              <div className="mt-4 h-32 border-t border-line-subtle pt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendWindow} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2c6291" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#2c6291" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={[0, 10]} hide />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                      formatter={(v: number) => [v.toFixed(2), 'rating']}
                    />
                    <Area type="monotone" dataKey="rating" stroke="#2c6291" strokeWidth={1.5} fill="url(#trendFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Risk distribution</CardTitle></CardHeader>
          <CardBody className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="level" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {riskData.map((d) => (
                    <Cell key={d.level} fill={RISK_COLOURS[d.level] ?? '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Sector breakdown</CardTitle></CardHeader>
          <CardBody className="h-64">
            {sectorData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-ink-faint">
                No companies yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorData} layout="vertical" margin={{ left: 100, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="sector" stroke="#64748b" fontSize={10} width={100} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#2b74a8" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="label">Avg claim credibility</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
            {formatScore(data.avg_performance_score ?? null)}
          </p>
          <p className="mt-1 text-xs text-ink-faint">From all stored analyses</p>
        </Card>
        <Card className="p-5">
          <p className="label">Avg ESG trust score</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
            {formatScore(data.avg_trust_score)}
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            {data.avg_trust_score === null
              ? 'Pending — needs performance scores'
              : 'Composite score'}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent analyses</CardTitle>
          <Link
            to="/companies"
            className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
          >
            View companies <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          {recent.isLoading ? (
            <div className="flex h-24 items-center justify-center"><Spinner /></div>
          ) : recentItems.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-faint">
              No analyses yet. Upload a report and run one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line-subtle text-left">
                  <tr className="text-2xs uppercase tracking-wider text-ink-faint">
                    <th className="px-5 py-3 font-medium">Company</th>
                    <th className="px-5 py-3 font-medium">Sector</th>
                    <th className="px-5 py-3 text-right font-medium">Rating</th>
                    <th className="px-5 py-3 font-medium">Risk</th>
                    <th className="px-5 py-3 text-right font-medium">Credibility</th>
                    <th className="px-5 py-3 font-medium">Model</th>
                    <th className="px-5 py-3 text-right font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {recentItems.map((a) => {
                    const rating = a.risk_rating ?? (
                      a.greenwashing_probability != null ? a.greenwashing_probability * 10 : null
                    )
                    return (
                      <tr key={a.id} className="row-hover border-b border-line-subtle last:border-0">
                        <td className="px-5 py-3">
                          <Link
                            to={`/analysis/${a.id}`}
                            className="font-medium text-ink hover:text-brand-700"
                          >
                            {a.company_name || 'Unknown'}
                          </Link>
                          {a.ticker && (
                            <span className="ml-2 font-mono text-xs text-ink-faint">
                              {a.ticker}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-ink-muted">{a.sector ?? '—'}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={cn('font-mono font-semibold tabular-nums', ratingTone(rating))}>
                            {rating !== null ? rating.toFixed(2) : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {a.greenwashing_risk ? (
                            <Badge className={riskTone(a.greenwashing_risk)}>{a.greenwashing_risk}</Badge>
                          ) : <span className="text-ink-faint">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-ink-muted">
                          {formatScore(a.claim_credibility_score)}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-ink-faint">
                          {a.model_version ?? '—'}
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-ink-faint">
                          {formatDate(a.created_at)}
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
