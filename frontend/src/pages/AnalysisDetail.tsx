import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, CheckCircle2, Gauge } from 'lucide-react'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { cn, formatDate, formatScore, riskTone } from '@/lib/utils'
import type { Analysis } from '@/types'
import { ExplanationPanel } from '@/components/ExplanationPanel'
import { AttributionPanel } from '@/components/AttributionPanel'
import { NarrativeCard } from '@/components/NarrativeCard'
import { FactorChart } from '@/components/FactorChart'

interface EvidenceRow {
  claim_id: string | null
  sentence: string
  page_number: number | null
  claim_type: string | null
  metric: string
  direction: string | null
  claimed_pct: number | null
  actual_pct: number | null
  divergence: number
  interpretation: string
  reliable: boolean
}

interface AnalysisWithExtras extends Analysis {
  evidence_table?: EvidenceRow[]
  evidence_summary?: Record<string, unknown>
}

function ratingToneClass(r: number | null | undefined): string {
  if (r === null || r === undefined) return 'text-slate-500'
  if (r < 3) return 'text-eco-700'
  if (r < 6) return 'text-amber-700'
  return 'text-red-700'
}

function ratingBoxClass(r: number | null | undefined): string {
  if (r === null || r === undefined) return 'border-slate-200 bg-slate-50'
  if (r < 3) return 'border-eco-200 bg-eco-50'
  if (r < 6) return 'border-amber-200 bg-amber-50'
  return 'border-red-200 bg-red-50'
}

function ratingBand(r: number | null | undefined): string {
  if (r === null || r === undefined) return '-'
  if (r < 3) return 'LOW'
  if (r < 6) return 'MEDIUM'
  return 'HIGH'
}

export function AnalysisDetail() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => api.get<AnalysisWithExtras>(`/analysis/${id}`),
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
          Back to dashboard
        </Link>
      </Card>
    )
  }

  const a = data
  const rating = a.risk_rating ?? (a.greenwashing_probability != null ? a.greenwashing_probability * 10 : null)

  return (
    <div className="space-y-6 stagger">
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
              Model <span className="font-mono">{a.model_version}</span> &middot; created {formatDate(a.created_at)} &middot; status {a.status}
            </p>
          </div>
          {a.greenwashing_risk && (
            <Badge className={riskTone(a.greenwashing_risk) + ' px-3 py-1 text-sm'}>
              {a.greenwashing_risk} RISK
            </Badge>
          )}
        </div>
      </div>

      <Card className={cn('border-2', ratingBoxClass(rating))}>
        <CardBody className="flex flex-wrap items-center justify-between gap-6 py-6">
          <div>
            <p className="label">Greenwashing Risk Rating</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={cn('relative', ratingToneClass(rating))}>
                <span className={cn(
                  'absolute inset-0 rounded-full animate-pulse-ring',
                  rating !== null && rating >= 6 ? 'bg-red-400/20' :
                  rating !== null && rating >= 3 ? 'bg-amber-400/20' : 'bg-eco-400/20',
                )} />
                <AnimatedNumber
                  value={rating}
                  decimals={2}
                  duration={1400}
                  className="relative text-6xl font-semibold"
                />
              </span>
              <span className="text-3xl text-ink-faint">/10</span>
              <span className={cn('ml-2 text-sm font-medium uppercase tracking-wide', ratingToneClass(rating))}>
                {ratingBand(rating)}
              </span>
            </div>
            <p className="mt-3 max-w-lg text-xs text-slate-500">
              Rating = 10 x greenwashing probability. Combines claim vagueness,
              claim-vs-indicator divergence, and indicator weakness.
              <strong> Potential risk indicator</strong> - not a determination of intent.
            </p>
          </div>
          {rating !== null && (
            <div className="text-right">
              <Gauge className={cn('ml-auto h-10 w-10', ratingToneClass(rating))} />
              <p className="mt-2 text-xs text-slate-500">
                Model confidence: {a.confidence_score != null ? `${(a.confidence_score * 100).toFixed(0)}%` : 'N/A'}
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-5">
          <p className="label">Claim credibility</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
            {formatScore(a.claim_credibility_score)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            How well-supported the claims are (evidence + strength)
          </p>
        </Card>
        <Card className="p-5">
          <p className="label">Greenwashing probability</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
            {a.greenwashing_probability?.toFixed(4) ?? '-'}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            0-1 raw model output (rating = x10)
          </p>
        </Card>
        <Card className="p-5">
          <p className="label">ESG trust score</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
            {formatScore(a.esg_trust_score)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {a.esg_trust_score == null ? 'Pending ESG performance score' : 'Composite score'}
          </p>
        </Card>
      </div>

      {a.evidence_table && a.evidence_table.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Claim vs Indicator Evidence
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 text-left">
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">Claim</th>
                    <th className="px-5 py-3 font-medium">Metric</th>
                    <th className="px-5 py-3 font-medium text-right">Claimed</th>
                    <th className="px-5 py-3 font-medium text-right">Actual</th>
                    <th className="px-5 py-3 font-medium text-right">Divergence</th>
                    <th className="px-5 py-3 font-medium">Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  {a.evidence_table.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="max-w-md px-5 py-3 text-slate-700">
                        <p className="line-clamp-2 text-xs">{row.sentence}</p>
                        {row.page_number && (
                          <p className="mt-1 text-[10px] text-slate-400">p.{row.page_number}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">{row.metric}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                        {row.claimed_pct != null ? row.claimed_pct.toFixed(3) : '-'}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                        {row.actual_pct != null ? row.actual_pct.toFixed(3) : '-'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={cn(
                            'font-mono tabular-nums',
                            row.divergence > 0.65
                              ? 'text-red-700'
                              : row.divergence > 0.35
                              ? 'text-amber-700'
                              : 'text-eco-700',
                          )}
                        >
                          {row.divergence.toFixed(3)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600">{row.interpretation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <AttributionPanel analysisId={a.id} />

      <NarrativeCard analysisId={a.id} />

      <FactorChart analysisId={a.id} />

      <ExplanationPanel analysisId={a.id} />

      {a.missing_data && Object.keys(a.missing_data).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" /> Missing data
            </CardTitle>
          </CardHeader>
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