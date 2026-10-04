import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Maximize2, Sparkles, X } from 'lucide-react'

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
  expanded?: boolean
  onToggle?: (next: boolean) => void
}

export function NarrativeCard({ analysisId, expanded = false, onToggle }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['narrative', analysisId],
    queryFn: () => api.get<NarrativeResponse>(`/explanations/${analysisId}/narrative`),
  })

  // Lock body scroll + escape key when modal open
  useEffect(() => {
    if (!expanded) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onToggle?.(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [expanded, onToggle])

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

  if (error || !data) return null

  return (
    <>
      {/* Inline card (clickable) */}
      <Card
        className="group cursor-pointer"
        onClick={() => onToggle?.(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle?.(true)
          }
        }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Research Finding
            </CardTitle>
            <span className="flex items-center gap-1 rounded-md border border-line bg-surface-muted px-2 py-1 text-2xs text-ink-faint transition-colors group-hover:border-brand-300 group-hover:bg-brand-50 group-hover:text-brand-700">
              <Maximize2 className="h-3 w-3" />
              Click to expand
            </span>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-sm leading-relaxed text-ink line-clamp-2">
            {data.narrative}
          </p>

          {(data.components.claim_vagueness !== null ||
            data.components.claim_indicator_divergence !== null ||
            data.components.indicator_weakness !== null) && (
            <div className="mt-4 grid gap-3 border-t border-line-subtle pt-4 sm:grid-cols-3">
              <div>
                <p className="label">Claim vagueness</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                  {data.components.claim_vagueness != null
                    ? data.components.claim_vagueness.toFixed(3)
                    : '-'}
                </p>
              </div>
              <div>
                <p className="label">Claim-indicator divergence</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                  {data.components.claim_indicator_divergence != null
                    ? data.components.claim_indicator_divergence.toFixed(3)
                    : '-'}
                </p>
              </div>
              <div>
                <p className="label">Indicator weakness</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                  {data.components.indicator_weakness != null
                    ? data.components.indicator_weakness.toFixed(3)
                    : '-'}
                </p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Expanded modal */}
      {expanded && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          onClick={() => onToggle?.(false)}
        >
          {/* Blurred backdrop */}
          <div
            className="absolute inset-0 animate-backdrop-blur bg-slate-950/50"
            style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          />

          {/* Modal panel */}
          <div
            className="animate-modal-pop relative z-10 max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line-subtle bg-surface/95 px-6 py-4 backdrop-blur">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand-700" />
                <h2 className="text-lg font-semibold tracking-tight text-ink">
                  Research Finding
                </h2>
              </div>
              <button
                onClick={() => onToggle?.(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              <p className="text-base leading-relaxed text-ink">
                {data.narrative}
              </p>

              {(data.components.claim_vagueness !== null ||
                data.components.claim_indicator_divergence !== null ||
                data.components.indicator_weakness !== null) && (
                <div className="grid gap-4 border-t border-line-subtle pt-6 sm:grid-cols-3">
                  <div className="surface-muted p-4">
                    <p className="label">Claim vagueness</p>
                    <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">
                      {data.components.claim_vagueness != null
                        ? data.components.claim_vagueness.toFixed(3)
                        : '-'}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">
                      How vague the report&apos;s language is
                    </p>
                  </div>
                  <div className="surface-muted p-4">
                    <p className="label">Claim-indicator divergence</p>
                    <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">
                      {data.components.claim_indicator_divergence != null
                        ? data.components.claim_indicator_divergence.toFixed(3)
                        : '-'}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">
                      Claim vs disclosed numbers gap
                    </p>
                  </div>
                  <div className="surface-muted p-4">
                    <p className="label">Indicator weakness</p>
                    <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">
                      {data.components.indicator_weakness != null
                        ? data.components.indicator_weakness.toFixed(3)
                        : '-'}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">
                      Absolute weakness of disclosed ESG metrics
                    </p>
                  </div>
                </div>
              )}

              {data.top_factors.length > 0 && (
                <div className="border-t border-line-subtle pt-6">
                  <p className="label">Top contributing factors</p>
                  <ul className="mt-3 space-y-2">
                    {data.top_factors.map((f) => (
                      <li
                        key={f.factor_id}
                        className="flex items-center justify-between rounded-lg border border-line bg-surface-muted px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink">{f.label}</p>
                          <p className="text-xs text-ink-faint">{f.category}</p>
                        </div>
                        <span
                          className={
                            f.contribution > 0
                              ? 'font-mono text-sm font-semibold text-red-700'
                              : 'font-mono text-sm font-semibold text-eco-700'
                          }
                        >
                          {f.contribution > 0 ? '+' : ''}
                          {f.contribution.toFixed(3)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-t border-line-subtle pt-4">
                <p className="text-xs text-ink-faint">
                  This is an AI-generated research assessment. It is not a certified ESG
                  audit or a legal determination. Human review is required before any
                  external use.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
