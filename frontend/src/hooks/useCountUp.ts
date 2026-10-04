import { useEffect, useRef, useState } from 'react'

interface Options {
  duration?: number   // ms
  decimals?: number   // fixed decimals
  start?: number
}

/**
 * Animates a number from `start` (default 0) to `target` with an
 * easing curve. Re-runs whenever `target` changes.
 *
 * Ideal for dashboard KPIs and analysis ratings.
 */
export function useCountUp(target: number | null | undefined, options: Options = {}) {
  const { duration = 900, decimals = 2, start = 0 } = options
  const [value, setValue] = useState(start)
  const frameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (target === null || target === undefined) {
      setValue(start)
      return
    }

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
    }
    startTimeRef.current = null

    const animate = (ts: number) => {
      if (startTimeRef.current === null) startTimeRef.current = ts
      const elapsed = ts - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out-cubic: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + (target - start) * eased
      setValue(current)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setValue(target)
      }
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [target, duration, start])

  const display = decimals > 0
    ? value.toFixed(decimals)
    : Math.round(value).toString()

  return display
}
