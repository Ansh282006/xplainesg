import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Brain, Sparkles } from 'lucide-react'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'

interface Row {
  id: string
  feature_name: string
  contribution: number
  direction: 'positive' | 'negative' | 'neutral' | null
  explanation_type: string
}

interface Props {
  analysisId: string
}

export function ExplanationPanel({ analysisId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['explanations', analysisId],
    queryFn: () =>
      api.get<{ items: Row[]; total: number }>(
        `/explanations/${analysisId}/persisted`,
      ),
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Model explanation (SHAP)</CardTitle></CardHeader>
        <CardBody className="h-40 flex items-center justify-center">
          <Spinner />
        </CardBody>
      </Card>
    )
  }

  const rows = data?.items ?? []

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4" /> Model explanation
          </CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-slate-500">
            No SHAP explanations persisted for this analysis. SHAP is
            computed on the top-strength claims and stored as feature
            contributions.
          </p>
        </CardBody>
      </Card>
    )
  }

  // Aggregate by feature — take the largest absolute contribution
  // across the top-3 claims, so the chart shows the most influential
  // tokens overall.
  const byFeature = new Map<string, Row>()
  for (const r of rows) {
    const existing = byFeature.get(r.feature_name)
    if (!existing || Math.abs(r.contribution) > Math.abs(existing.contribution)) {
      byFeature.set(r.feature_name, r)
    }
  }

  const chartRows = Array.from(byFeature.values())
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 12)
    .map((r) => ({
      name: r.feature_name,
      value: r.contribution,
      direction: r.direction,
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Model explanation (SHAP)
        </CardTitle>
      </CardHeader>
      <CardBody>
        <p className="mb-4 text-xs text-slate-500">
          Top feature contributions from the trained classifier. Negative values
          push toward <span className="font-medium text-eco-700">substantiated</span>;
          positive values push toward{' '}
          <span className="font-medium text-red-700">unsubstantiated</span>.
          These explain the model, not the company&apos;s intent.
        </p>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows} layout="vertical" margin={{ left: 80, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={100} />
              <Tooltip />
              <Bar dataKey="value">
                {chartRows.map((r) => (
                  <Cell key={r.name} fill={r.value < 0 ? '#1f9765' : '#c0392b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          SHAP values explain which tokens the trained model used. They are not
          proof of intent.
        </p>
      </CardBody>
    </Card>
  )
}
