import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef9f8',
          100: '#d5f0ed',
          200: '#abe0da',
          300: '#7ac9c0',
          400: '#4aada3',
          500: '#2f9188',
          600: '#24746e',
          700: '#215d59',
          800: '#1f4b48',
          900: '#1d3f3d',
        },
        surface: {
          DEFAULT: '#f8fafb',
          card: '#ffffff',
          muted: '#f1f5f7',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 16px rgba(15, 23, 42, 0.04)',
        elevated: '0 8px 32px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
