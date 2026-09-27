import { useQuery } from '@tanstack/react-query'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'

interface Row {
  sector?: string
  region?: string
  LOW: number
  MEDIUM: number
  HIGH: number
  TOTAL: number
}

interface FairnessData {
  by_sector: Row[]
  by_region: Row[]
  total_analyses: number
  note: string
}

const COLOURS = { LOW: '#1f9765', MEDIUM: '#c88a12', HIGH: '#c0392b' }

function DistributionChart({ data, labelKey }: { data: Row[]; labelKey: 'sector' | 'region' }) {
  const chartData = data.map((r) => ({
    name: r[labelKey] ?? 'Unspecified',
    LOW: r.LOW, MEDIUM: r.MEDIUM, HIGH: r.HIGH,
  }))
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
          <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="LOW" stackId="a" fill={COLOURS.LOW} />
          <Bar dataKey="MEDIUM" stackId="a" fill={COLOURS.MEDIUM} />
          <Bar dataKey="HIGH" stackId="a" fill={COLOURS.HIGH} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function DistTable({ data, labelKey }: { data: Row[]; labelKey: 'sector' | 'region' }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left">
        <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
          <th className="px-3 py-2 font-medium">{labelKey === 'sector' ? 'Sector' : 'Region'}</th>
          <th className="px-3 py-2 font-medium">LOW</th>
          <th className="px-3 py-2 font-medium">MEDIUM</th>
          <th className="px-3 py-2 font-medium">HIGH</th>
          <th className="px-3 py-2 font-medium">Total</th>
        </tr>
      </thead>
      <tbody>
        {data.map((r) => (
          <tr key={r[labelKey]} className="border-b border-slate-50 last:border-0">
            <td className="px-3 py-2 font-medium text-slate-800">{r[labelKey] ?? '—'}</td>
            <td className="px-3 py-2 tabular-nums">{r.LOW}</td>
            <td className="px-3 py-2 tabular-nums">{r.MEDIUM}</td>
            <td className="px-3 py-2 tabular-nums">{r.HIGH}</td>
            <td className="px-3 py-2 tabular-nums text-slate-500">{r.TOTAL}</td>
          </tr>
        ))}
        {data.length === 0 && (
          <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No data yet.</td></tr>
        )}
      </tbody>
    </table>
  )
}

export function Fairness() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['fairness'],
    queryFn: () => api.get<FairnessData>('/fairness'),
  })

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner className="h-7 w-7" /></div>
  }
  if (error || !data) {
    return <Card className="p-6"><p className="text-sm text-red-700">Fairness data unavailable.</p></Card>
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Fairness</h1>
        <p className="mt-1 text-sm text-slate-500">
          Risk distribution across sectors and regions. Sample sizes are shown so
          differences can be interpreted cautiously.
        </p>
      </header>

      <div className="disclaimer">
        {data.note}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>By sector</CardTitle></CardHeader>
          <CardBody><DistributionChart data={data.by_sector} labelKey="sector" /></CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>By region</CardTitle></CardHeader>
          <CardBody><DistributionChart data={data.by_region} labelKey="region" /></CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Sector detail</CardTitle></CardHeader>
        <CardBody className="p-0"><DistTable data={data.by_sector} labelKey="sector" /></CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Region detail</CardTitle></CardHeader>
        <CardBody className="p-0"><DistTable data={data.by_region} labelKey="region" /></CardBody>
      </Card>

      <p className="text-xs text-slate-500">
        Total analyses in scope: <span className="font-mono">{data.total_analyses}</span>
      </p>
    </div>
  )
}
