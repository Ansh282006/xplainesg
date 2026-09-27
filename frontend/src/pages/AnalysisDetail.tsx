import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, formatScore, riskTone } from '@/lib/utils'
import type { Analysis } from '@/types'
import { ExplanationPanel } from '@/components/ExplanationPanel'

export function AnalysisDetail() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => api.get<Analysis>(`/analysis/${id}`),
    enabled: !!id,
  })

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner className="h-7 w-7" /></div>
  }
  if (error || !data) {
    return (
      <Card className="p-6">
        <p className="text-sm text-red-700">Analysis not found.</p>
        <Link to="/dashboard" className="mt-2 inline-block text-sm text-brand-700 hover:underline">
          â† Back to dashboard
        </Link>
      </Card>
    )
  }

  const a = data

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/companies/${a.company_id}`}
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to company
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Analysis result
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Model <span className="font-mono">{a.model_version}</span> Â·
              created {formatDate(a.created_at)} Â· status {a.status}
            </p>
          </div>
          {a.greenwashing_risk && (
            <Badge className={riskTone(a.greenwashing_risk) + ' px-3 py-1 text-sm'}>
              {a.greenwashing_risk} RISK
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="label">Claim credibility</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
            {formatScore(a.claim_credibility_score)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="label">Greenwashing probability</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
            {a.greenwashing_probability?.toFixed(4) ?? 'â€”'}
          </p>
        </Card>
        <Card className="p-5">
          <p className="label">ESG performance</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
            {formatScore(a.esg_performance_score)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="label">ESG trust score</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
            {formatScore(a.esg_trust_score)}
          </p>
        </Card>
      </div>

      <ExplanationPanel analysisId={a.id} />

      {a.feature_vector && (
        <Card>
          <CardHeader><CardTitle>Feature vector (model input)</CardTitle></CardHeader>
          <CardBody>
            <pre className="overflow-x-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-800">
              {JSON.stringify(a.feature_vector, null, 2)}
            </pre>
          </CardBody>
        </Card>
      )}

      {a.missing_data && (
        <Card>
          <CardHeader><CardTitle>Missing data</CardTitle></CardHeader>
          <CardBody>
            <pre className="overflow-x-auto rounded-lg bg-amber-50 p-4 text-xs text-amber-900">
              {JSON.stringify(a.missing_data, null, 2)}
            </pre>
          </CardBody>
        </Card>
      )}

      <div className="disclaimer">
        This is a research-prototype assessment. It is not a certified ESG rating or a
        legal determination of wrongdoing. Human review is required before any external use.
      </div>
    </div>
  )
}
