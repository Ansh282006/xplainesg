import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-faint',
        'transition-all duration-base ease-out-quart',
        'hover:border-slate-300',
        'focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10',
        'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-faint',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
