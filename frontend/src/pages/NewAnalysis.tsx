import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertCircle, PlayCircle } from 'lucide-react'

import { api, ApiError } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import type { AnalysisResult, CompanyOverview } from '@/types'

interface ReportRow {
  id: string
  report_title: string
  report_year: number
}

export function NewAnalysis() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [companyId, setCompanyId] = useState(params.get('company') ?? '')
  const [reportId, setReportId] = useState('')
  const [indicators, setIndicators] = useState<Record<string, string>>({})

  const companies = useQuery({
    queryKey: ['companies-list'],
    queryFn: () => api.get<{ items: CompanyOverview[] }>('/companies?limit=200'),
  })

  const reports = useQuery({
    queryKey: ['reports', companyId],
    queryFn: () =>
      api.get<{ items: ReportRow[] }>(`/reports?company_id=${companyId}`),
    enabled: !!companyId,
  })

  useEffect(() => {
    if (reports.data?.items?.length && !reportId) {
      setReportId(reports.data.items[0].id)
    }
  }, [reports.data, reportId])

  const mutation = useMutation({
    mutationFn: (payload: { report_id: string; indicators?: Record<string, number> }) =>
      api.post<AnalysisResult>('/analysis', payload),
    onSuccess: (data) => {
      navigate(`/analysis/${data.analysis.id}`)
    },
  })

  const parsedIndicators = useMemo(() => {
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(indicators)) {
      if (v.trim() !== '') {
        const n = Number(v)
        if (!Number.isNaN(n)) out[k] = n
      }
    }
    return out
  }, [indicators])

  const canRun = !!reportId && !mutation.isPending

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New analysis</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick a company and report, optionally supply structured ESG indicators, then run
          the baseline scoring pipeline.
        </p>
      </header>

      <Card>
        <CardHeader><CardTitle>1. Select a company</CardTitle></CardHeader>
        <CardBody>
          {companies.isLoading ? (
            <Spinner />
          ) : (
            <select
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value)
                setReportId('')
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">— Choose a company —</option>
              {companies.data?.items?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.ticker ? `(${c.ticker})` : ''}
                </option>
              ))}
            </select>
          )}
        </CardBody>
      </Card>

      {companyId && (
        <Card>
          <CardHeader><CardTitle>2. Select a report</CardTitle></CardHeader>
          <CardBody>
            {reports.isLoading ? (
              <Spinner />
            ) : reports.data?.items?.length ? (
              <select
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {reports.data.items.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.report_title} (FY{r.report_year})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-slate-500">
                No reports found for this company. Upload one first via the ingestion script.
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {reportId && (
        <Card>
          <CardHeader><CardTitle>3. Structured ESG indicators (optional)</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <p className="text-xs text-slate-500">
              Leave blank to reuse any existing indicators from the database. Values you enter
              are labelled <span className="font-mono">manual_override</span>.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['renewable_energy_percentage', 'Renewable energy %'],
                ['carbon_emissions', 'Carbon emissions'],
                ['employee_count', 'Employee count'],
                ['board_independence', 'Board independence %'],
                ['board_diversity', 'Board diversity %'],
                ['governance_score', 'Governance score'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <Input
                    className="mt-1"
                    type="number"
                    step="any"
                    value={indicators[key] ?? ''}
                    onChange={(e) =>
                      setIndicators((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {mutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : 'Analysis failed. Check that the backend is running.'}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          variant="eco"
          size="lg"
          disabled={!canRun}
          onClick={() =>
            mutation.mutate({
              report_id: reportId,
              indicators:
                Object.keys(parsedIndicators).length > 0 ? parsedIndicators : undefined,
            })
          }
        >
          <PlayCircle className="h-4 w-4" />
          {mutation.isPending ? 'Running…' : 'Run analysis'}
        </Button>
        <Link to="/companies" className="text-sm text-slate-500 hover:text-slate-900">
          Cancel
        </Link>
      </div>
    </div>
  )
}
