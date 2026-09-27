/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pastel: {
          blue: '#EBF3FA',
          'blue-accent': '#3B82F6',
          green: '#EAF7EE',
          'green-accent': '#10B981',
          purple: '#F3E8FF',
          'purple-accent': '#8B5CF6',
          amber: '#FEF3C7',
          'amber-accent': '#F59E0B',
          rose: '#FFE4E6',
          'rose-accent': '#F43F5E',
          slate: '#F8FAFC',
        },
      },
    },
  },
  plugins: [],
};