import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatScore(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return v.toFixed(1)
}

export function formatDate(v: string | null | undefined): string {
  if (!v) return '—'
  return new Date(v).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export function riskTone(risk: string | null | undefined) {
  switch (risk) {
    case 'LOW':    return 'bg-eco-50 text-eco-700 border-eco-200'
    case 'MEDIUM': return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'HIGH':   return 'bg-red-50 text-red-700 border-red-200'
    default:       return 'bg-slate-100 text-slate-500 border-slate-200'
  }
}
