/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#090D16",
        glassBg: "rgba(17, 22, 34, 0.75)",
        glassBorder: "rgba(255, 255, 255, 0.07)",
      },
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
      }
    },
  },
  plugins: [],
}
