/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],

  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF1F2',
          100: '#FFE4E6',
          200: '#FECDD3',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#F43F5E',
          600: '#E11D48',
          700: '#BE123C',
          800: '#9F1239',
          900: '#881337',
          950: '#4c0519',
          DEFAULT: '#E11D48',

          glow: '#FB7185',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          soft: '#FAFAF9',
          muted: '#F1F5F9',
          border: '#E2E8F0',
          hover: '#F8FAFC',
        },
        ink: {
          DEFAULT: '#0F172A',
          muted: '#475569',
          faint: '#94A3B8',
          light: '#1E293B',
        },
        amber: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
        },
        emerald: {
          DEFAULT: '#059669',
          light: '#D1FAE5',
        },
        danger: '#E11D48',
      },
      fontFamily: {
        display: ['"Outfit"', '"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', '"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        craft: '0 4px 20px -2px rgba(225, 29, 72, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        craftHover: '0 12px 32px -4px rgba(225, 29, 72, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.06)',
        crimsonGlow: '0 0 0 1px rgba(225, 29, 72, 0.2), 0 4px 20px rgba(225, 29, 72, 0.25)',
        glow: '0 0 0 1px rgba(244, 63, 94, 0.25), 0 0 20px rgba(244, 63, 94, 0.15)',
      },

    },
  },
  plugins: [],
}

