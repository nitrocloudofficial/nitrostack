module.exports = {
  content: ['./web/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'aurora-navy':   '#0B2545',
        'aurora-slate':  '#134074',
        'aurora-mist':   '#8DA9C4',
        'aurora-cloud':  '#EEF4ED',
        'aurora-signal': '#C1440E',
        'aurora-ok':     '#1B7F5F'
      },
      fontFamily: {
        sans: ['Inter Tight', 'Helvetica Neue', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace']
      },
      borderRadius: { card: '2px' },
      spacing: { gutter: '18px' }
    }
  },
  plugins: []
};
