import { useQuery } from '@tanstack/react-query'
import { FileText, Sparkles } from 'lucide-react'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'

interface NarrativeResponse {
  narrative: string
  rating: number | null
  top_factors: {
    factor_id: string
    label: string
    category: string
    contribution: number
    direction: string
    n_tokens: number
  }[]
  components: {
    claim_vagueness: number | null
    claim_indicator_divergence: number | null
    indicator_weakness: number | null
  }
}

interface Props {
  analysisId: string
}

export function NarrativeCard({ analysisId }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['narrative', analysisId],
    queryFn: () => api.get<NarrativeResponse>(`/explanations/${analysisId}/narrative`),
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Research Finding
          </CardTitle>
        </CardHeader>
        <CardBody className="flex h-24 items-center justify-center">
          <Spinner />
        </CardBody>
      </Card>
    )
  }

  if (error || !data) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Research Finding
        </CardTitle>
      </CardHeader>
      <CardBody>
        <p className="text-sm leading-relaxed text-slate-700">
          {data.narrative}
        </p>

        {(data.components.claim_vagueness !== null ||
          data.components.claim_indicator_divergence !== null ||
          data.components.indicator_weakness !== null) && (
          <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
            <div>
              <p className="label">Claim vagueness</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {data.components.claim_vagueness != null
                  ? data.components.claim_vagueness.toFixed(3)
                  : '-'}
              </p>
            </div>
            <div>
              <p className="label">Claim-indicator divergence</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {data.components.claim_indicator_divergence != null
                  ? data.components.claim_indicator_divergence.toFixed(3)
                  : '-'}
              </p>
            </div>
            <div>
              <p className="label">Indicator weakness</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {data.components.indicator_weakness != null
                  ? data.components.indicator_weakness.toFixed(3)
                  : '-'}
              </p>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}