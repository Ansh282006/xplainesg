import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const TITLES: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/companies':   'Companies',
  '/analysis':    'New Analysis',
  '/claims':      'Claim Explorer',
  '/fairness':    'Fairness',
  '/models':      'Models',
  '/audit':       'Audit Log',
  '/governance':  'AI Governance',
  '/settings':    'Settings',
  '/login':       'Sign In',
  '/':            'XplainESG',
}

/**
 * Updates document.title based on the current route.
 * Falls back to the brand string for unlisted routes.
 */
export function usePageTitle() {
  const location = useLocation()

  useEffect(() => {
    const path = location.pathname

    // Exact match first
    if (TITLES[path]) {
      document.title = `${TITLES[path]} · XplainESG`
      return
    }

    // Prefix match (e.g. /companies/{uuid})
    for (const key of Object.keys(TITLES)) {
      if (key !== '/' && path.startsWith(key)) {
        document.title = `${TITLES[key]} · XplainESG`
        return
      }
    }

    document.title = 'XplainESG'
  }, [location.pathname])
}