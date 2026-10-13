/** @type {import('tailwindcss').Config} */

/**
 * Tailwind CSS Configuration — Project Invenio
 *
 * Design System Principles:
 * - Dark mode first (class-based)
 * - Professional developer tool aesthetic (inspired by Linear, Vercel, Cursor)
 * - Consistent spacing scale
 * - Neutral-based color palette with accent colors
 *
 * Future: The UI team will extend this configuration with the final design system.
 */
export default {
  // Dark mode toggled via class on <html>
  darkMode: ['class'],

  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],

  theme: {
    extend: {
      /**
       * Color Palette
       * Built around CSS custom properties for easy theming.
       * All colors use HSL values defined in index.css.
       */
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Invenio brand colors
        invenio: {
          50:  'hsl(220, 60%, 97%)',
          100: 'hsl(220, 55%, 93%)',
          200: 'hsl(220, 50%, 85%)',
          300: 'hsl(220, 48%, 72%)',
          400: 'hsl(220, 46%, 58%)',
          500: 'hsl(220, 70%, 50%)',
          600: 'hsl(220, 72%, 42%)',
          700: 'hsl(220, 74%, 34%)',
          800: 'hsl(220, 72%, 26%)',
          900: 'hsl(220, 68%, 18%)',
          950: 'hsl(220, 64%, 10%)',
        },
      },

      /**
       * Border Radius
       * Matches shadcn/ui convention using CSS variables.
       */
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      /**
       * Typography
       * Inter for UI, JetBrains Mono for code.
       */
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },

      /**
       * Keyframe Animations
       * Used by shadcn/ui components and Framer Motion integrations.
       */
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-from-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-from-left': 'slide-in-from-left 0.25s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },

  plugins: [],
}
