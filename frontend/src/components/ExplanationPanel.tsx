import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Brain, Sparkles } from 'lucide-react'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'

interface ExplanationRow {
  id: string
  analysis_id: string
  explanation_type: 'SHAP' | 'LIME'
  feature_name: string
  contribution: number
  direction: 'positive' | 'negative' | 'neutral' | null
  created_at: string
}

interface Props {
  analysisId: string
}

export function ExplanationPanel({ analysisId }: Props) {
  const [tab, setTab] = useState<'SHAP' | 'LIME'>('SHAP')

  const { data, isLoading, error } = useQuery({
    queryKey: ['explanations', analysisId, tab],
    queryFn: () =>
      api.get<{ items: ExplanationRow[]; total: number }>(
        `/explanations/${analysisId}/persisted`,
      ),
  })

  const rows = (data?.items ?? []).filter((r) => r.explanation_type === tab)

  const byFeature = new Map<string, ExplanationRow>()
  for (const r of rows) {
    const prev = byFeature.get(r.feature_name)
    if (!prev || Math.abs(r.contribution) > Math.abs(prev.contribution)) {
      byFeature.set(r.feature_name, r)
    }
  }

  const chartRows = Array.from(byFeature.values())
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 12)
    .map((r) => ({
      name: r.feature_name,
      value: r.contribution,
      positive: r.contribution > 0,
    }))

  // Compute a sensible symmetric domain centered on 0
  const maxAbs = chartRows.length
    ? Math.max(...chartRows.map((r) => Math.abs(r.value)), 0)
    : 1
  // Round up to a "nice" number
  const niceMax = maxAbs <= 0.001 ? 0.001
    : maxAbs <= 0.01 ? 0.01
    : maxAbs <= 0.05 ? 0.05
    : maxAbs <= 0.1 ? 0.1
    : maxAbs <= 0.25 ? 0.25
    : maxAbs <= 0.5 ? 0.5
    : Math.ceil(maxAbs * 10) / 10

  const domain: [number, number] = [-niceMax, niceMax]
  const ticks = [-niceMax, -niceMax / 2, 0, niceMax / 2, niceMax]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Model explanation
          </CardTitle>
          <div className="flex gap-1 rounded-lg border border-slate-200 p-0.5">
            {(['SHAP', 'LIME'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  tab === k
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {isLoading && (
          <div className="flex h-40 items-center justify-center"><Spinner /></div>
        )}

        {error && (
          <p className="text-sm text-red-700">
            Failed to load explanations. {error instanceof Error ? error.message : ''}
          </p>
        )}

        {!isLoading && !error && chartRows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Brain className="h-5 w-5 text-slate-400" />
            <p className="text-sm text-slate-500">
              No {tab} explanations persisted for this analysis.
            </p>
            <p className="text-xs text-slate-400">
              Re-run the analysis to generate them.
            </p>
          </div>
        )}

        {chartRows.length > 0 && (
          <>
            <p className="mb-4 text-xs text-slate-500">
              Top feature contributions from the trained classifier ({tab}).{' '}
              <span className="font-medium text-eco-700">Green (negative)</span> pushes
              toward <em>substantiated</em>;{' '}
              <span className="font-medium text-red-700">red (positive)</span> pushes
              toward <em>unsubstantiated</em>. X-axis range: [{niceMax.toFixed(3)},{' '}
              {niceMax.toFixed(3)}].
            </p>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartRows}
                  layout="vertical"
                  margin={{ left: 140, right: 30, top: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    domain={domain}
                    ticks={ticks}
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(v: number) => v.toFixed(niceMax < 0.05 ? 3 : 2)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    width={150}
                  />
                  <Tooltip
                    formatter={(v: number) => [v.toFixed(5), 'contribution']}
                  />
                  <ReferenceLine x={0} stroke="#94a3b8" />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartRows.map((r) => (
                      <Cell
                        key={r.name}
                        fill={r.value < 0 ? '#1f9765' : '#c0392b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              {rows.length} explanation rows &middot; method: {tab}
            </p>
          </>
        )}
      </CardBody>
    </Card>
  )
}
