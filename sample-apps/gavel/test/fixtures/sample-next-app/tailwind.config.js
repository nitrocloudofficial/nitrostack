/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#6366F1",
        accent: "#10B981",
        darkBg: "#0F172A",
      },
      fontFamily: {
        sans: ["Geist", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
