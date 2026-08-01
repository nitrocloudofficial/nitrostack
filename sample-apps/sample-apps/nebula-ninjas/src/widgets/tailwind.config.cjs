/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sentinel: {
          bg: '#090d16',
          card: 'rgba(15, 23, 42, 0.85)',
          border: 'rgba(56, 189, 248, 0.2)',
          cyan: '#38bdf8',
          red: '#f43f5e',
          green: '#10b981',
          amber: '#f59e0b',
        }
      }
    },
  },
  plugins: [],
};
