import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck } from 'lucide-react'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, riskTone } from '@/lib/utils'

interface PendingAnalysis {
  id: string
  company_name: string | null
  ticker: string | null
  esg_trust_score: number | null
  greenwashing_risk: string | null
  risk_rating: number | null
  created_at: string
}

export function ReviewQueue() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['pending-reviews'],
    queryFn: () => api.get<{ items: PendingAnalysis[] }>('/reviews/pending'),
  })

  return (
    <div className="space-y-6 stagger">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Review Queue</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Analyses awaiting human sign-off. All AI outputs are labelled "potential risk".
        </p>
      </header>

      <Card>
        <CardHeader><CardTitle>Pending reviews</CardTitle></CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-5"><SkeletonTable rows={3} cols={5} /></div>
          ) : error ? (
            <EmptyState title="Could not load queue" description="Check backend connection." />
          ) : !data?.items?.length ? (
            <EmptyState
              icon={<ShieldCheck className="h-6 w-6 text-eco-600" />}
              title="All caught up"
              description="No analyses are currently awaiting review."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line-subtle text-left text-2xs uppercase tracking-wider text-ink-faint">
                  <tr>
                    <th className="px-5 py-3 font-medium">Company</th>
                    <th className="px-5 py-3 text-right font-medium">Rating</th>
                    <th className="px-5 py-3 font-medium">Risk</th>
                    <th className="px-5 py-3 text-right font-medium">Analysed</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((a) => {
                    const rating = a.risk_rating ?? (a.greenwashing_risk ? 5 : null)
                    return (
                      <tr key={a.id} className="row-hover border-b border-line-subtle last:border-0">
                        <td className="px-5 py-3">
                          <p className="font-medium text-ink">{a.company_name || 'Unknown'}</p>
                          <p className="font-mono text-xs text-ink-faint">{a.ticker}</p>
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums text-ink">
                          {rating ? rating.toFixed(2) : '—'}
                        </td>
                        <td className="px-5 py-3">
                          {a.greenwashing_risk ? (
                            <Badge className={riskTone(a.greenwashing_risk)}>{a.greenwashing_risk}</Badge>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-ink-faint">
                          {formatDate(a.created_at)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link to={`/analysis/${a.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                            Review <ArrowRight className="h-3 w-3" />
                          </Link>
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