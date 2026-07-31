/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg:               '#0B0B0B',
        card:             '#141414',
        'card-hover':     '#1A1A1A',
        gold:             '#D4AF37',
        'gold-dim':       'rgba(212,175,55,0.15)',
        'gold-light':     '#F2C14E',
        blue:             '#5EA2FF',
        red:              '#FF4D4F',
        green:            '#00C853',
        amber:            '#FFB300',
        // Legacy
        bgPrimary:        '#0A0A0A',
        bgSecondary:      '#111111',
        bgTertiary:       '#171717',
        accentGold:       '#D4AF37',
        accentGoldLight:  '#F2C14E',
        accentBlue:       '#4F8CFF',
        criticalRed:      '#FF4D4F',
        successGreen:     '#00C853',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      keyframes: {
        statusPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.6', transform: 'scale(1.3)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-700px 0' },
          '100%': { backgroundPosition: '700px 0' },
        },
        pageFadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        statusPulse: 'statusPulse 2s ease-in-out infinite',
        shimmer:     'shimmer 1.8s ease-in-out infinite',
        pageFadeUp:  'pageFadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [],
};
