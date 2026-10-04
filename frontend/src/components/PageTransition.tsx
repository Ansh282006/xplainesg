import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * Wraps routed content and re-triggers the entrance animation on
 * every pathname change. Feels like a polished SaaS page transition.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [key, setKey] = useState(location.pathname)

  useEffect(() => {
    setKey(location.pathname)
  }, [location.pathname])

  return (
    <div
      key={key}
      className={cn('animate-fade-in animate-slide-up')}
      style={{ animationFillMode: 'both' }}
    >
      {children}
    </div>
  )
}