/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4A90E2",
        secondary: "#F5A623",
        success: "#7ED321",
        error: "#D0021B",
        background: "#F8F9FA",
      },
    },
  },
  plugins: [],
}
