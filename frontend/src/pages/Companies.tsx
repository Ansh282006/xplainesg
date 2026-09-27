import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { api } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, formatScore, riskTone } from '@/lib/utils'
import type { CompanyOverview } from '@/types'

interface Page { items: CompanyOverview[]; total: number }

export function Companies() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get<Page>('/companies?limit=100'),
  })

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner className="h-7 w-7" /></div>
  }

  if (error || !data) {
    return (
      <Card className="p-6">
        <p className="text-sm text-red-700">
          Could not load companies. {error instanceof Error ? error.message : ''}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Note: /companies endpoint is a Phase 2 addition. If it 404s, we'll add it next.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Companies</h1>
        <p className="mt-1 text-sm text-slate-500">
          {data.total} {data.total === 1 ? 'company' : 'companies'} in the workspace.
        </p>
      </header>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left">
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Sector</th>
                <th className="px-5 py-3 font-medium">Country</th>
                <th className="px-5 py-3 font-medium">Risk</th>
                <th className="px-5 py-3 font-medium">Trust</th>
                <th className="px-5 py-3 font-medium">Last analysed</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <Link to={`/companies/${c.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                      {c.name}
                    </Link>
                    {c.ticker && <span className="ml-2 font-mono text-xs text-slate-400">{c.ticker}</span>}
                    {c.is_demo && (
                      <Badge className="ml-2 border-amber-200 bg-amber-50 text-amber-700">DEMO</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{c.sector ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-600">{c.country ?? '—'}</td>
                  <td className="px-5 py-3">
                    {c.greenwashing_risk ? (
                      <Badge className={riskTone(c.greenwashing_risk)}>{c.greenwashing_risk}</Badge>
                    ) : (
                      <span className="text-slate-400">Not analysed</span>
                    )}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-slate-700">{formatScore(c.esg_trust_score)}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(c.last_analyzed_at)}</td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                    No companies yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
