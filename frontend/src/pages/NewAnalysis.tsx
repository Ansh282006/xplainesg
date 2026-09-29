import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertCircle, Info, PlayCircle, TrendingUp } from 'lucide-react'

import { api, ApiError } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import type { AnalysisResult, CompanyOverview } from '@/types'

interface ReportRow {
  id: string
  report_title: string
  report_year: number
}

interface PreviewResponse {
  rating: number | null
  weakness: number | null
  signals: Record<string, number>
  breakdown: {
    formula: string
    reason: string | null
    n_signals: number
  }
  note: string
}

const INDICATOR_FIELDS: Array<[key: string, label: string, hint: string]> = [
  ['renewable_energy_percentage', 'Renewable energy %', '0–100'],
  ['carbon_emissions', 'Carbon emissions', 'tCO2e'],
  ['employee_count', 'Employee count', 'integer'],
  ['board_independence', 'Board independence %', '0–100'],
  ['board_diversity', 'Board diversity %', '0–100'],
  ['governance_score', 'Governance score', '0–100'],
]

const SIGNAL_LABELS: Record<string, string> = {
  renewable_energy_percentage: 'Low renewables',
  board_independence: 'Low board independence',
  board_diversity: 'Low board diversity',
  governance_score: 'Weak governance',
  employee_turnover: 'High turnover',
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function ratingToneClass(r: number | null): string {
  if (r === null) return 'text-slate-500'
  if (r < 3) return 'text-eco-700'
  if (r < 6) return 'text-amber-700'
  return 'text-red-700'
}

function ratingBoxClass(r: number | null): string {
  if (r === null) return 'border-slate-200 bg-slate-50'
  if (r < 3) return 'border-eco-200 bg-eco-50'
  if (r < 6) return 'border-amber-200 bg-amber-50'
  return 'border-red-200 bg-red-50'
}

function ratingBand(r: number | null): string {
  if (r === null) return 'Awaiting data'
  if (r < 3) return 'LOW'
  if (r < 6) return 'MEDIUM'
  return 'HIGH'
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
    queryFn: () => api.get<{ items: ReportRow[] }>(`/reports?company_id=${companyId}`),
    enabled: !!companyId,
  })

  useEffect(() => {
    if (reports.data?.items?.length && !reportId) {
      setReportId(reports.data.items[0].id)
    }
  }, [reports.data, reportId])

  // Parse non-empty indicator values into numbers
  const debouncedIndicators = useDebounce(indicators, 400)
  const parsedIndicators = useMemo(() => {
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(debouncedIndicators)) {
      if (v.trim() !== '') {
        const n = Number(v)
        if (!Number.isNaN(n)) out[k] = n
      }
    }
    return out
  }, [debouncedIndicators])

  const preview = useQuery({
    queryKey: ['analysis-preview', parsedIndicators],
    queryFn: () =>
      api.post<PreviewResponse>('/analysis/preview', { indicators: parsedIndicators }),
    enabled: Object.keys(parsedIndicators).length > 0,
    staleTime: 30_000,
  })

  const mutation = useMutation({
    mutationFn: (payload: { report_id: string; indicators?: Record<string, number> }) =>
      api.post<AnalysisResult>('/analysis', payload),
    onSuccess: (data) => {
      navigate(`/analysis/${data.analysis.id}`)
    },
  })

  const canRun = !!reportId && !mutation.isPending

  const previewRating = preview.data?.rating ?? null
  const signals = preview.data?.signals ?? {}

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New analysis</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick a company and report, optionally supply structured ESG indicators, then run
          the baseline scoring pipeline. The live rating on the right updates as you type.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: form */}
        <div className="space-y-6 lg:col-span-2">
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
              <CardHeader>
                <CardTitle>3. Structured ESG indicators (optional)</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <p className="text-xs text-slate-500">
                  Leave blank to reuse any existing indicators from the database. Values you
                  enter here are used for the live preview and the final analysis.
                </p>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {INDICATOR_FIELDS.map(([key, label, hint]) => (
                    <div key={key}>
                      <label className="label flex items-center justify-between">
                        <span>{label}</span>
                        <span className="text-[10px] font-normal normal-case text-slate-400">
                          {hint}
                        </span>
                      </label>
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

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIndicators({})}
                    disabled={Object.keys(indicators).length === 0}
                  >
                    Clear all
                  </Button>
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

        {/* RIGHT: live preview panel */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 space-y-4">
            <Card className={cn('border-2', ratingBoxClass(previewRating))}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Live risk preview
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="flex items-baseline gap-2">
                  <span className={cn('text-5xl font-semibold tabular-nums', ratingToneClass(previewRating))}>
                    {previewRating !== null ? previewRating.toFixed(2) : '—'}
                  </span>
                  <span className="text-2xl text-slate-400">/10</span>
                </div>

                <div className={cn('mt-2 text-xs font-medium uppercase tracking-wide', ratingToneClass(previewRating))}>
                  {ratingBand(previewRating)}
                </div>

                {preview.isFetching && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Spinner className="h-3 w-3" />
                    updating…
                  </div>
                )}

                {preview.data && preview.data.breakdown.n_signals > 0 && (
                  <>
                    <div className="mt-5 border-t border-slate-200 pt-4">
                      <p className="label">Contributing signals</p>
                      <ul className="mt-2 space-y-2">
                        {Object.entries(signals)
                          .sort(([, a], [, b]) => b - a)
                          .map(([key, value]) => (
                            <li key={key}>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-700">
                                  {SIGNAL_LABELS[key] ?? key}
                                </span>
                                <span className="font-mono text-slate-500">
                                  {(value as number).toFixed(2)}
                                </span>
                              </div>
                              <div className="mt-1 h-1.5 rounded-full bg-slate-200">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    (value as number) > 0.66
                                      ? 'bg-red-500'
                                      : (value as number) > 0.33
                                      ? 'bg-amber-500'
                                      : 'bg-eco-500',
                                  )}
                                  style={{ width: `${Math.round((value as number) * 100)}%` }}
                                />
                              </div>
                            </li>
                          ))}
                      </ul>
                    </div>
                    <p className="mt-4 text-[11px] text-slate-500">{preview.data.note}</p>
                  </>
                )}

                {(!preview.data || preview.data.breakdown.n_signals === 0) &&
                  Object.keys(parsedIndicators).length === 0 && (
                    <p className="mt-4 text-xs text-slate-500">
                      Fill in indicator values on the left to see a live preview.
                      The preview uses only the values you type — no DB, no ML.
                    </p>
                  )}

                {preview.data?.breakdown.reason && (
                  <p className="mt-3 flex items-start gap-1 text-[11px] text-slate-500">
                    <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
                    {preview.data.breakdown.reason}
                  </p>
                )}
              </CardBody>
            </Card>

            <p className="text-[11px] leading-relaxed text-slate-500">
              <strong className="text-slate-600">Formula:</strong> rating = 10 × mean of per-field
              weakness, where weakness for each field is a transparent linear map (e.g.&nbsp;
              <span className="font-mono">1 − renewables_pct/100</span>). This preview does{' '}
              <em>not</em> call the ML model and does not touch the database.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}