import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, FileText, Globe, PlayCircle } from 'lucide-react'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, formatScore, riskTone } from '@/lib/utils'
import type { Analysis, CompanyOverview } from '@/types'

interface ReportRow {
  id: string
  report_title: string
  report_year: number
  processing_status: string
  file_path: string | null
}

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>()

  const company = useQuery({
    queryKey: ['company', id],
    queryFn: () => api.get<CompanyOverview>(`/companies/${id}`),
    enabled: !!id,
  })

  const reports = useQuery({
    queryKey: ['company-reports', id],
    queryFn: () => api.get<{ items: ReportRow[] }>(`/reports?company_id=${id}`),
    enabled: !!id,
  })

  const history = useQuery({
    queryKey: ['company-history', id],
    queryFn: () => api.get<{ items: Analysis[] }>(`/companies/${id}/history`),
    enabled: !!id,
  })

  if (company.isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner className="h-7 w-7" /></div>
  }
  if (company.error || !company.data) {
    return (
      <Card className="p-6">
        <p className="text-sm text-red-700">Company not found.</p>
        <Link to="/companies" className="mt-2 inline-block text-sm text-brand-700 hover:underline">
          ← Back to companies
        </Link>
      </Card>
    )
  }

  const c = company.data
  const latest = history.data?.items?.[0]

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/companies"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Companies
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{c.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              {c.ticker && <span className="font-mono">{c.ticker}</span>}
              {c.sector && <span>· {c.sector}</span>}
              {c.country && <span>· {c.country}</span>}
              {c.is_demo && (
                <Badge className="border-amber-200 bg-amber-50 text-amber-700">DEMO</Badge>
              )}
            </div>
          </div>
          <Link to={`/analysis?company=${c.id}`}>
            <Button variant="eco">
              <PlayCircle className="h-4 w-4" /> Run new analysis
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="label">Greenwashing risk</p>
          <p className="mt-2">
            {latest?.greenwashing_risk ? (
              <Badge className={riskTone(latest.greenwashing_risk)}>
                {latest.greenwashing_risk}
              </Badge>
            ) : (
              <span className="text-sm text-slate-500">Not analysed</span>
            )}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            {latest?.greenwashing_probability != null
              ? `Probability: ${latest.greenwashing_probability.toFixed(4)}`
              : 'Baseline model — no probability yet'}
          </p>
        </Card>
        <Card className="p-5">
          <p className="label">Claim credibility</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {formatScore(latest?.claim_credibility_score)}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            {latest ? 'From most recent analysis' : 'Run an analysis to compute'}
          </p>
        </Card>
        <Card className="p-5">
          <p className="label">ESG trust score</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {formatScore(latest?.esg_trust_score)}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            {latest?.esg_trust_score == null
              ? 'Pending — needs ESG performance score'
              : ''}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Reports
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {reports.isLoading ? (
              <div className="flex h-24 items-center justify-center"><Spinner /></div>
            ) : reports.data?.items?.length ? (
              <ul className="divide-y divide-slate-100">
                {reports.data.items.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{r.report_title}</p>
                      <p className="text-xs text-slate-500">
                        FY{r.report_year} · {r.processing_status}
                        {r.file_path ? ' · stored' : ''}
                      </p>
                    </div>
                    <Link
                      to={`/claims?report=${r.id}`}
                      className="text-xs text-brand-700 hover:underline"
                    >
                      View claims →
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-slate-500">No reports yet.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Analysis history
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {history.isLoading ? (
              <div className="flex h-24 items-center justify-center"><Spinner /></div>
            ) : history.data?.items?.length ? (
              <ul className="divide-y divide-slate-100">
                {history.data.items.slice(0, 8).map((a) => (
                  <li key={a.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {a.model_version ?? 'model'} · {a.status}
                      </p>
                      <p className="text-xs text-slate-500">{formatDate(a.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        credibility {formatScore(a.claim_credibility_score)}
                      </p>
                      {a.greenwashing_risk && (
                        <Badge className={riskTone(a.greenwashing_risk)}>
                          {a.greenwashing_risk}
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-slate-500">No analyses yet.</p>
            )}
          </CardBody>
        </Card>
      </div>

      {(c.website || c.description) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4" /> Overview
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {c.description && <p className="text-sm text-slate-700">{c.description}</p>}
            {c.website && (
              <a
                href={c.website}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-brand-700 hover:underline"
              >
                {c.website}
              </a>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
