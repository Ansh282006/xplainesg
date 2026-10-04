export const colors = {
  brand: { 50: '#eff4f9', 100: '#d9e5f0', 500: '#2c6291', 600: '#1f4d76', 700: '#1a3f61', 900: '#132a44' },
  eco: { 400: '#3cb881', 500: '#1f9d6a', 600: '#157f54', 700: '#126444' },
  ink: { DEFAULT: '#0f172a', muted: '#475569', faint: '#94a3b8' },
  line: { DEFAULT: '#e2e8f0', subtle: '#f1f5f9' },
  risk: { low: '#1f9d6a', medium: '#c88a12', high: '#c0392b' },
  chart: { primary: '#2c6291', positive: '#1f9d6a', negative: '#c0392b', neutral: '#94a3b8', grid: '#e2e8f0', axis: '#64748b' },
} as const

export const shadows = {
  xs: '0 1px 2px 0 rgb(15 23 42 / 0.04)',
  sm: '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.04)',
  md: '0 4px 8px -2px rgb(15 23 42 / 0.06), 0 2px 4px -2px rgb(15 23 42 / 0.04)',
  lg: '0 12px 20px -6px rgb(15 23 42 / 0.08), 0 4px 8px -4px rgb(15 23 42 / 0.04)',
} as const

export const duration = { fast: 120, base: 180, slow: 280 } as const
