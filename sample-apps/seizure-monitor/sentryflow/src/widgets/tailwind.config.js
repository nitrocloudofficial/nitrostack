/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#0a0c10',
          800: '#10131a',
          700: '#161b25',
          600: '#1e2534',
          500: '#252d3d',
        },
        border: {
          DEFAULT: '#1e2534',
          subtle: '#151b28',
        },
        accent: {
          blue: '#3b82f6',
          'blue-glow': 'rgba(59,130,246,0.15)',
        },
        risk: {
          red: '#ef4444',
          'red-muted': 'rgba(239,68,68,0.12)',
          amber: '#f59e0b',
          'amber-muted': 'rgba(245,158,11,0.12)',
          green: '#10b981',
          'green-muted': 'rgba(16,185,129,0.12)',
        },
        text: {
          primary: '#e2e8f0',
          secondary: '#94a3b8',
          muted: '#4b5675',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.5)',
        glow: '0 0 20px rgba(59,130,246,0.15)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-ring': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'progress': {
          '0%': { strokeDashoffset: '251' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
        'scale-in': 'scale-in 0.3s ease-out both',
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
        'progress': 'progress 1s ease-out both',
      },
    },
  },
  plugins: [],
};
