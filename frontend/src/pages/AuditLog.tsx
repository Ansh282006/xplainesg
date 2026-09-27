import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'

import { api } from '@/lib/api'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

interface AuditRow {
  id: number
  timestamp: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown> | null
}

export function AuditLog() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get<{ items: AuditRow[]; total: number }>('/audit-logs?limit=100'),
  })

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner className="h-7 w-7" /></div>
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-sm text-red-700">
          {error instanceof Error ? error.message : 'Cannot load audit log.'}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Audit log requires the <strong>reviewer</strong> or <strong>admin</strong> role.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Audit log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every state-changing action in the system, newest first.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> {data?.total ?? 0} entries
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 text-left">
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Time</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Entity</th>
                  <th className="px-5 py-3 font-medium">Entity ID</th>
                  <th className="px-5 py-3 font-medium">User</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3 text-slate-600">
                      {new Date(r.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <Badge className="border-slate-200 bg-slate-50 text-slate-700 font-mono text-[11px]">
                        {r.action}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{r.entity_type ?? '—'}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {r.entity_id ? r.entity_id.slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {r.user_id ? r.user_id.slice(0, 8) + '…' : 'system'}
                    </td>
                  </tr>
                ))}
                {data?.items?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">
                      No audit entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
