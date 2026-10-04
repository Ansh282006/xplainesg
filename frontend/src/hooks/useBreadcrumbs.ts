import { useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'

interface Crumb { label: string; to?: string }

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', companies: 'Companies', analysis: 'Analysis',
  claims: 'Claim Explorer', fairness: 'Fairness', models: 'Models',
  audit: 'Audit Log', governance: 'AI Governance', settings: 'Settings',
}

export function useBreadcrumbs(): Crumb[] {
  const location = useLocation()
  const params = useParams<{ id?: string }>()

  return useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean)
    if (segments.length === 0) return []
    const crumbs: Crumb[] = []
    let accumulated = ''
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      accumulated += `/${seg}`
      if (i === 0) {
        crumbs.push({ label: ROUTE_LABELS[seg] ?? capitalize(seg), to: accumulated })
        continue
      }
      if (isUuid(seg)) {
        crumbs.push({ label: `#${seg.slice(0, 6)}`, to: accumulated })
        continue
      }
      crumbs.push({
        label: ROUTE_LABELS[seg] ?? capitalize(seg),
        to: i < segments.length - 1 ? accumulated : undefined,
      })
    }
    return crumbs
  }, [location.pathname, params])
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
}
