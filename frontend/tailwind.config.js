/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef6fb', 100: '#d7e9f5', 200: '#b0d3ea', 300: '#7fb5da',
          400: '#4a92c4', 500: '#2b74a8', 600: '#1f5b8a', 700: '#1b4a70',
          800: '#1a3f5e', 900: '#12304a', 950: '#0b2135',
        },
        eco: {
          50:  '#eefaf4', 100: '#d3f2e2', 200: '#a7e5c6', 300: '#71d0a3',
          400: '#3fb47f', 500: '#1f9765', 600: '#147a51', 700: '#116142',
          800: '#104d36', 900: '#0d3f2d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}