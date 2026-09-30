import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  ArrowRight, Building2, FileText, Gauge, ShieldAlert,
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

function StatCard({ label, value, hint, icon }: {
  label: string
  value: string | number
  hint?: string
  icon?: React.ReactNode
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="label">{label}</p>
        {icon && <span className="text-brand-600">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  )
}

function ratingTone(r: number | null | undefined): string {
  if (r === null || r === undefined) return 'text-slate-500'
  if (r < 3) return 'text-eco-700'
  if (r < 6) return 'text-amber-700'
  return 'text-red-700'
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
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="p-6">
        <p className="text-sm text-red-700">
          Could not load dashboard statistics.{' '}
          {error instanceof Error ? error.message : ''}
        </p>
      </Card>
    )
  }

  const riskData = ['LOW', 'MEDIUM', 'HIGH'].map((level) => ({
    level,
    count: data.risk_distribution[level] ?? 0,
  }))

  const sectorData = (data.sector_distribution || []).slice(0, 8)
  const recentItems = recent.data?.items ?? []

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Aggregate view across all analysed companies. Values are computed from stored
          analyses — nothing is simulated.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Companies"
          value={data.total_companies}
          icon={<Building2 className="h-4 w-4" />}
        />
        <StatCard
          label="Reports"
          value={data.total_reports}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Claims extracted"
          value={data.total_claims.toLocaleString()}
          icon={<Gauge className="h-4 w-4" />}
        />
        <StatCard
          label="Pending reviews"
          value={data.pending_reviews}
          icon={<ShieldAlert className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Greenwashing risk distribution</CardTitle>
          </CardHeader>
          <CardBody className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="level" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {riskData.map((d) => (
                    <Cell key={d.level} fill={RISK_COLOURS[d.level] ?? '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sector distribution</CardTitle>
          </CardHeader>
          <CardBody className="h-72">
            {sectorData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No companies yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorData} layout="vertical" margin={{ left: 140, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="sector"
                    stroke="#64748b"
                    fontSize={11}
                    width={140}
                  />
                  <Tooltip />
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
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
            {formatScore(data.avg_performance_score ?? null)}
          </p>
          <p className="mt-1 text-xs text-slate-500">From all stored analyses</p>
        </Card>
        <Card className="p-5">
          <p className="label">Avg ESG trust score</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
            {formatScore(data.avg_trust_score)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {data.avg_trust_score === null
              ? 'Not yet computed — needs performance scores'
              : ''}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent analyses</CardTitle>
          <Link
            to="/companies"
            className="flex items-center gap-1 text-xs text-brand-700 hover:underline"
          >
            View companies <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          {recent.isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Spinner />
            </div>
          ) : recentItems.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              No analyses yet. Upload a report and run one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 text-left">
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">Company</th>
                    <th className="px-5 py-3 font-medium">Sector</th>
                    <th className="px-5 py-3 font-medium text-right">Rating</th>
                    <th className="px-5 py-3 font-medium">Risk</th>
                    <th className="px-5 py-3 font-medium text-right">Credibility</th>
                    <th className="px-5 py-3 font-medium">Model</th>
                    <th className="px-5 py-3 font-medium text-right">When</th>
                  </tr>
                </thead>
                <tbody>
                  {recentItems.map((a) => {
                    const rating = a.risk_rating ?? (
                      a.greenwashing_probability != null ? a.greenwashing_probability * 10 : null
                    )
                    return (
                      <tr
                        key={a.id}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                      >
                        <td className="px-5 py-3">
                          <Link
                            to={`/analysis/${a.id}`}
                            className="font-medium text-slate-900 hover:text-brand-700"
                          >
                            {a.company_name || 'Unknown'}
                          </Link>
                          {a.ticker && (
                            <span className="ml-2 font-mono text-xs text-slate-400">
                              {a.ticker}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{a.sector ?? '—'}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={cn('font-mono font-semibold tabular-nums', ratingTone(rating))}>
                            {rating !== null ? rating.toFixed(2) : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {a.greenwashing_risk ? (
                            <Badge className={riskTone(a.greenwashing_risk)}>
                              {a.greenwashing_risk}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                          {formatScore(a.claim_credibility_score)}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">
                          {a.model_version ?? '—'}
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-slate-500">
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
