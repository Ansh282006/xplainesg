/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- Brand: slate-blue, desaturated for enterprise feel ---
        brand: {
          50:  '#eff4f9',
          100: '#d9e5f0',
          200: '#b4cce0',
          300: '#7fa7ca',
          400: '#4a80ad',
          500: '#2c6291',
          600: '#1f4d76',
          700: '#1a3f61',
          800: '#183452',
          900: '#132a44',
          950: '#0b1c2e',
        },
        // --- Eco / success ---
        eco: {
          50:  '#ecf9f2',
          100: '#d2f1e0',
          200: '#a6e3c4',
          300: '#6fd0a2',
          400: '#3cb881',
          500: '#1f9d6a',
          600: '#157f54',
          700: '#126444',
          800: '#104f37',
          900: '#0d402d',
        },
        // --- Semantic surfaces ---
        canvas: {
          DEFAULT: '#f8fafc',   // page background
          alt:     '#f1f5f9',   // alternate surfaces
        },
        surface: {
          DEFAULT: '#ffffff',   // card / modal background
          muted:   '#f8fafc',   // subtle fills
          hover:   '#f1f5f9',   // hover states
        },
        ink: {
          DEFAULT: '#0f172a',   // primary text
          muted:   '#475569',   // secondary
          faint:   '#94a3b8',   // tertiary / placeholder
        },
        line: {
          DEFAULT: '#e2e8f0',   // default border
          subtle:  '#f1f5f9',   // very light divider
          strong:  '#cbd5e1',   // emphasized border
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Tighter, more editorial scale
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],   // 11px
        'xs':  ['0.75rem',   { lineHeight: '1.125rem' }], // 12px
        'sm':  ['0.8125rem', { lineHeight: '1.25rem' }],  // 13px
        'base':['0.875rem',  { lineHeight: '1.375rem' }], // 14px
        'lg':  ['1rem',      { lineHeight: '1.5rem' }],   // 16px
        'xl':  ['1.125rem',  { lineHeight: '1.625rem' }], // 18px
        '2xl': ['1.375rem',  { lineHeight: '1.75rem' }],  // 22px
        '3xl': ['1.75rem',   { lineHeight: '2rem' }],     // 28px
        '4xl': ['2.25rem',   { lineHeight: '2.5rem' }],   // 36px
        '5xl': ['3rem',      { lineHeight: '1' }],        // 48px
        '6xl': ['3.75rem',   { lineHeight: '1' }],        // 60px
      },
      borderRadius: {
        'sm': '0.375rem',  // 6px — inputs, badges
        'DEFAULT': '0.5rem', // 8px
        'md': '0.625rem',  // 10px
        'lg': '0.75rem',   // 12px — cards
        'xl': '1rem',      // 16px — hero cards
        '2xl': '1.25rem',  // 20px — modals
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(15 23 42 / 0.04)',
        'sm': '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.04)',
        'md': '0 4px 8px -2px rgb(15 23 42 / 0.06), 0 2px 4px -2px rgb(15 23 42 / 0.04)',
        'lg': '0 12px 20px -6px rgb(15 23 42 / 0.08), 0 4px 8px -4px rgb(15 23 42 / 0.04)',
        'xl': '0 20px 40px -12px rgb(15 23 42 / 0.10), 0 8px 16px -8px rgb(15 23 42 / 0.04)',
        'focus-brand': '0 0 0 3px rgb(44 98 145 / 0.15)',
        'focus-eco':   '0 0 0 3px rgb(31 157 106 / 0.15)',
        'focus-danger':'0 0 0 3px rgb(220 38 38 / 0.15)',
      },
      transitionDuration: {
        'fast': '120ms',
        'base': '180ms',
        'slow': '280ms',
      },
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 1.6s linear infinite',
      },
      backgroundImage: {
        'skeleton': 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)',
      },
    },
  },
  plugins: [],
}
