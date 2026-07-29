/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0D1321',
          light: '#121A2B',
        },
        surface: {
          DEFAULT: '#161E2E',
          raised: '#1D2740',
          border: '#2A3650',
        },
        amber: {
          DEFAULT: '#F5A623',
          dim: '#B87A1A',
          glow: '#FFC966',
        },
        cyan: {
          DEFAULT: '#4FD1C5',
          dim: '#2F9C92',
        },
        ink_text: {
          DEFAULT: '#E8ECF1',
          muted: '#8A95A5',
          faint: '#5C667A',
        },
        danger: '#F0654B',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(245,166,35,0.25), 0 0 24px rgba(245,166,35,0.15)',
        cyanGlow: '0 0 0 1px rgba(79,209,197,0.25), 0 0 24px rgba(79,209,197,0.15)',
      },
    },
  },
  plugins: [],
}
