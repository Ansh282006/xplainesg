import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, AlertTriangle, ShieldCheck, MessageSquare } from 'lucide-react'

import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

type Decision = 'accepted' | 'rejected' | 'needs_review'

interface ReviewData {
  id: string
  reviewer_decision: Decision
  reviewer_comments: string | null
  reviewed_at: string
}

interface Props { analysisId: string }

export function ReviewWidget({ analysisId }: Props) {
  const { role } = useAuth()
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')

  const canReview = role === 'admin' || role === 'reviewer'

  const { data: review, isLoading } = useQuery({
    queryKey: ['review', analysisId],
    queryFn: () => api.get<ReviewData | null>(`/analysis/${analysisId}/review`),
  })

  const mutation = useMutation({
    mutationFn: (decision: Decision) =>
      api.post(`/analysis/${analysisId}/review`, { decision, comments: comment || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', analysisId] })
      setComment('')
    },
  })

  if (isLoading) return null

  if (review) {
    const tone = review.reviewer_decision === 'accepted'
      ? 'border-eco-200 bg-eco-50'
      : review.reviewer_decision === 'rejected'
      ? 'border-red-200 bg-red-50'
      : 'border-amber-200 bg-amber-50'

    const label = review.reviewer_decision === 'accepted' ? 'ACCEPTED'
      : review.reviewer_decision === 'rejected' ? 'REJECTED'
      : 'NEEDS REVIEW'

    return (
      <Card className={`border-2 ${tone}`}>
        <CardBody className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              <p className="font-semibold text-ink">Human Review: {label}</p>
            </div>
            {review.reviewer_comments && (
              <p className="mt-2 text-sm text-ink-muted">"{review.reviewer_comments}"</p>
            )}
            <p className="mt-1 text-xs text-ink-faint">Reviewed {formatDate(review.reviewed_at)}</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (!canReview) return null

  return (
    <Card className="border-2 border-brand-200 bg-brand-50/30">
      <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Human Review Required</CardTitle></CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm text-ink-muted">You have permission to review this analysis. The AI output is a *potential* risk indicator, not a verdict.</p>
        <Input placeholder="Optional reviewer comments…" value={comment} onChange={(e) => setComment(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button variant="eco" onClick={() => mutation.mutate('accepted')} disabled={mutation.isPending}>
            <CheckCircle2 className="mr-1 h-4 w-4" /> Accept
          </Button>
          <Button variant="outline" onClick={() => mutation.mutate('needs_review')} disabled={mutation.isPending}>
            <AlertTriangle className="mr-1 h-4 w-4" /> Needs Review
          </Button>
          <Button variant="danger" onClick={() => mutation.mutate('rejected')} disabled={mutation.isPending}>
            Reject
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}