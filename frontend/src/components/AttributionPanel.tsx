import { useQuery } from '@tanstack/react-query'
import {
  Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Info, Layers, Sparkles, TrendingDown } from 'lucide-react'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { AnimatedFormula } from '@/components/AnimatedFormula'

interface Contribution {
  component: string
  label: string
  description: string
  value: number | null
  weight: number
  normalized_weight: number | null
  contribution: number | null
  available: boolean
}

interface Sensitivity {
  if_zero: string
  new_rating: number
  delta: number
}

interface Attribution {
  rating: number | null
  formula: string
  contributions: Contribution[]
  sensitivity: Sensitivity[]
  hypothetical: {
    scenario: string
    new_rating: number
    current_rating: number
    delta: number
  } | null
  weights_config: Record<string, number>
  note: string
}

interface Props {
  analysisId: string
}

function toneClass(rating: number | null): string {
  if (rating === null) return 'text-slate-500'
  if (rating < 3) return 'text-eco-700'
  if (rating < 6) return 'text-amber-700'
  return 'text-red-700'
}

function boxClass(rating: number | null): string {
  if (rating === null) return 'border-slate-200 bg-slate-50'
  if (rating < 3) return 'border-eco-200 bg-eco-50'
  if (rating < 6) return 'border-amber-200 bg-amber-50'
  return 'border-red-200 bg-red-50'
}

const COMPONENT_COLOR: Record<string, string> = {
  claim_vagueness: '#c0392b',
  claim_indicator_divergence: '#c88a12',
  indicator_strength: '#2b74a8',
}

export function AttributionPanel({ analysisId }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['attribution', analysisId],
    queryFn: () => api.get<Attribution>(`/explanations/${analysisId}/rating-attribution`),
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Why this rating?
          </CardTitle>
        </CardHeader>
        <CardBody className="flex h-40 items-center justify-center">
          <Spinner />
        </CardBody>
      </Card>
    )
  }

  if (error || !data) {
    return null
  }

  const available = data.contributions.filter((c) => c.available)
  const chartData = available.map((c) => ({
    name: c.label,
    contribution: c.contribution ?? 0,
    component: c.component,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Why this rating?
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-6">
        <div className={cn('rounded-xl border-2 p-5', boxClass(data.rating))}>
          <p className="label">Final rating</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn('text-5xl font-semibold tabular-nums', toneClass(data.rating))}>
              {data.rating !== null ? data.rating.toFixed(2) : '-'}
            </span>
            <span className="text-2xl text-slate-400">/10</span>
          </div>
          <p className="mt-3 text-xs text-slate-600">{data.note}</p>
          <div className="mt-3">
            <AnimatedFormula formula={data.formula} />
          </div>
        </div>

        <div>
          <p className="label mb-2 flex items-center gap-2">
            <Layers className="h-3 w-3" /> Contribution waterfall
          </p>
          <p className="mb-3 text-xs text-slate-500">
            Each component contributes a slice of the total rating. Sum equals the final rating.
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 180, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={11}
                  width={180}
                />
                <Tooltip
                  formatter={(v: number) => [`${v.toFixed(3)} rating points`, 'Contribution']}
                />
                <ReferenceLine x={0} stroke="#94a3b8" />
                <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
                  {chartData.map((d) => (
                    <Cell key={d.component} fill={COMPONENT_COLOR[d.component] || '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="label mb-2">Component detail</p>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 font-medium">Component</th>
                  <th className="px-4 py-2 font-medium text-right">Raw value</th>
                  <th className="px-4 py-2 font-medium text-right">Weight</th>
                  <th className="px-4 py-2 font-medium text-right">Contribution</th>
                </tr>
              </thead>
              <tbody>
                {data.contributions.map((c) => (
                  <tr key={c.component} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <p className="font-medium text-slate-800">{c.label}</p>
                      <p className="text-[11px] text-slate-500">{c.description}</p>
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-700">
                      {c.value !== null ? c.value.toFixed(4) : '-'}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-500">
                      {(c.normalized_weight ?? c.weight).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      <span
                        className={cn(
                          'font-semibold',
                          (c.contribution ?? 0) > 1.5
                            ? 'text-red-700'
                            : (c.contribution ?? 0) > 0.5
                            ? 'text-amber-700'
                            : 'text-slate-700',
                        )}
                      >
                        +{(c.contribution ?? 0).toFixed(3)}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 bg-slate-50">
                  <td className="px-4 py-2 font-semibold text-slate-800">Total</td>
                  <td className="px-4 py-2" />
                  <td className="px-4 py-2" />
                  <td className="px-4 py-2 text-right font-mono font-semibold tabular-nums text-slate-900">
                    = {data.rating !== null ? data.rating.toFixed(3) : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {data.sensitivity.length > 0 && (
          <div>
            <p className="label mb-2 flex items-center gap-2">
              <TrendingDown className="h-3 w-3" /> Sensitivity - what if a signal were 0?
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {data.sensitivity.map((s) => (
                <div key={s.if_zero} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    Zero {s.if_zero}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                    {s.new_rating.toFixed(2)}
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-xs font-medium',
                      s.delta < 0 ? 'text-eco-700' : 'text-red-700',
                    )}
                  >
                    {s.delta > 0 ? '+' : ''}
                    {s.delta.toFixed(3)} vs current
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.hypothetical && (
          <div className="rounded-lg border border-eco-200 bg-eco-50 p-4">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-eco-800">
              <Info className="h-3 w-3" /> What-if scenario
            </p>
            <p className="mt-2 text-sm text-slate-800">{data.hypothetical.scenario}</p>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-eco-800">
              {data.hypothetical.current_rating.toFixed(2)}
              <span className="mx-2 text-slate-400">to</span>
              {data.hypothetical.new_rating.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-eco-700">
              Change: {data.hypothetical.delta > 0 ? '+' : ''}
              {data.hypothetical.delta.toFixed(2)} rating points
            </p>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4">
          <p className="label">Weights (configurable in backend/app/core/scoring.py)</p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
            {Object.entries(data.weights_config).map(([k, v]) => (
              <span key={k} className="font-mono">
                {k}: <span className="font-semibold text-slate-800">{v}</span>
              </span>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}