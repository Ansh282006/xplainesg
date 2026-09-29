import { useQuery } from '@tanstack/react-query'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Layers } from 'lucide-react'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'

interface MatchedToken {
  token: string
  contribution: number
  direction: string | null
}

interface Factor {
  factor_id: string
  label: string
  category: 'environmental' | 'social' | 'governance'
  contribution: number
  direction: 'substantiated' | 'unsubstantiated'
  matched_tokens: MatchedToken[]
  n_tokens: number
}

interface FactorsResponse {
  all_factors: { factor_id: string; label: string; category: string }[]
  shap_factors: Factor[]
  lime_factors: Factor[]
  shap_token_count: number
  lime_token_count: number
}

interface Props {
  analysisId: string
}

const CATEGORY_COLOR: Record<string, string> = {
  environmental: '#1f9765',
  social: '#2b74a8',
  governance: '#64748b',
}

export function FactorChart({ analysisId }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['factors', analysisId],
    queryFn: () => api.get<FactorsResponse>(`/explanations/${analysisId}/factors`),
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> ESG Factor Contributions
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

  const byFactor = new Map<string, Factor>()
  for (const f of data.shap_factors) {
    byFactor.set(f.factor_id, { ...f })
  }
  for (const f of data.lime_factors) {
    const existing = byFactor.get(f.factor_id)
    if (existing) {
      if (Math.abs(f.contribution) > Math.abs(existing.contribution)) {
        existing.contribution = f.contribution
        existing.direction = f.direction
      }
    } else {
      byFactor.set(f.factor_id, { ...f })
    }
  }

  const rows = Array.from(byFactor.values())
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 10)
    .map((f) => ({
      name: f.label,
      category: f.category,
      value: f.contribution,
      tokens: f.n_tokens,
    }))

  if (rows.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-4 w-4" /> ESG Factor Contributions
        </CardTitle>
      </CardHeader>
      <CardBody>
        <p className="mb-4 text-xs text-slate-500">
          SHAP and LIME tokens mapped to 10 real ESG factors.
          Negative (green) pushes toward substantiated; positive (red) toward unsubstantiated.
        </p>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ left: 160, right: 20, top: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={170} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0].payload as { name: string; value: number; tokens: number; category: string }
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="mt-1 text-slate-500">Category: {p.category}</p>
                      <p className="text-slate-500">Contribution: {p.value.toFixed(4)}</p>
                      <p className="text-slate-500">Tokens: {p.tokens}</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="value">
                {rows.map((r) => (
                  <Cell
                    key={r.name}
                    fill={r.value < 0 ? (CATEGORY_COLOR[r.category] || '#1f9765') : '#c0392b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}