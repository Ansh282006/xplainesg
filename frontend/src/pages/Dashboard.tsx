import { useQuery } from '@tanstack/react-query'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Building2, FileText, Gauge, ShieldAlert } from 'lucide-react'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { formatScore } from '@/lib/utils'
import type { DashboardStats } from '@/types'

const RISK_COLOURS: Record<string, string> = {
  LOW: '#1f9765', MEDIUM: '#c88a12', HIGH: '#c0392b',
}

function StatCard({ label, value, hint, icon }: {
  label: string; value: string | number; hint?: string; icon?: React.ReactNode
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

export function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
  })

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner className="h-7 w-7" /></div>
  }

  if (error || !data) {
    return (
      <Card className="p-6">
        <p className="text-sm text-red-700">
          Could not load dashboard statistics. {error instanceof Error ? error.message : ''}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Note: the /dashboard/stats endpoint is a Phase 2 addition. If it 404s, we'll add it next.
        </p>
      </Card>
    )
  }

  const riskData = ['LOW', 'MEDIUM', 'HIGH'].map((level) => ({
    level, count: data.risk_distribution[level] ?? 0,
  }))

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
        <StatCard label="Companies" value={data.total_companies} icon={<Building2 className="h-4 w-4" />} />
        <StatCard label="Reports" value={data.total_reports} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Claims extracted" value={data.total_claims} icon={<Gauge className="h-4 w-4" />} />
        <StatCard label="Pending reviews" value={data.pending_reviews} icon={<ShieldAlert className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Greenwashing risk distribution</CardTitle></CardHeader>
          <CardBody className="h-64">
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
          <CardHeader><CardTitle>Average scores</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <div>
              <p className="label">Avg claim credibility</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">
                {formatScore(data.avg_performance_score ?? null)}
              </p>
              <p className="mt-1 text-xs text-slate-500">From all stored analyses</p>
            </div>
            <div>
              <p className="label">Avg ESG trust score</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">
                {formatScore(data.avg_trust_score)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {data.avg_trust_score === null ? 'Not yet computed — needs performance scores' : ''}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
