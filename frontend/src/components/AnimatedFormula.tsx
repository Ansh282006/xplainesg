import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  formula: string
  className?: string
}

/**
 * Renders a formula string with a two-phase animation:
 *  1. Letter-stagger fade-in (each character slides up)
 *  2. A shimmer sweep runs across the text once per 6s to draw the eye
 */
export function AnimatedFormula({ formula, className }: Props) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80)
    return () => clearTimeout(t)
  }, [])

  const chars = formula.split('')

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md border border-brand-100 bg-gradient-to-br from-brand-50/70 via-white to-eco-50/50 px-3 py-2.5',
        'shadow-xs',
        className,
      )}
    >
      {/* Ambient shimmer sweep */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent"
        style={{ animation: 'formulaShimmer 6s ease-in-out infinite' }}
      />

      <p className="relative font-mono text-[11px] leading-relaxed text-brand-900">
        {chars.map((ch, i) => (
          <span
            key={i}
            className={cn(
              'inline-block transition-all duration-500 ease-out-quart',
              revealed ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
            )}
            style={{ transitionDelay: `${i * 8}ms` }}
          >
            {ch === ' ' ? '\u00A0' : ch}
          </span>
        ))}
      </p>
    </div>
  )
}