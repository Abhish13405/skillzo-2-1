/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],

  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#172554',
          DEFAULT: '#2563EB',

          glow: '#60A5FA',
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
        danger: '#EF4444',
      },
      fontFamily: {
        display: ['"Outfit"', '"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', '"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        xs: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        craft: '0 4px 20px -2px rgba(37, 99, 235, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        craftHover: '0 12px 32px -4px rgba(37, 99, 235, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.06)',
        crimsonGlow: '0 0 0 1px rgba(37, 99, 235, 0.2), 0 4px 20px rgba(37, 99, 235, 0.25)',
        glow: '0 0 0 1px rgba(59, 130, 246, 0.25), 0 0 20px rgba(59, 130, 246, 0.15)',
      },

    },
  },
  plugins: [],
}

