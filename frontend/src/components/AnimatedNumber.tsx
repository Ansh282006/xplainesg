import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'

interface Props {
  value: number | null | undefined
  duration?: number
  decimals?: number
  className?: string
  prefix?: string
  suffix?: string
  /** Renders a dash when value is null */
  fallback?: string
}

export function AnimatedNumber({
  value,
  duration = 900,
  decimals = 2,
  className,
  prefix = '',
  suffix = '',
  fallback = '—',
}: Props) {
  const display = useCountUp(value, { duration, decimals })

  if (value === null || value === undefined) {
    return <span className={className}>{fallback}</span>
  }

  return (
    <span className={cn('tabular-nums', className)}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}