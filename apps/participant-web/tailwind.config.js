/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#E30613",
        accent: "#FF6B00",
        background: "#050505",
        "dark-red": "#7A0000",
        "dark-charcoal": "#1A1A1A",
      },
      fontFamily: {
        bebas: ["Bebas Neue", "sans-serif"],
        anton: ["Anton", "sans-serif"],
        oswald: ["Oswald", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        space: ["Space Grotesk", "sans-serif"],
        manrope: ["Manrope", "sans-serif"],
        marker: ["Permanent Marker", "cursive"],
        rubik_glitch: ["Rubik Glitch", "cursive"],
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
      }
    },
  },
  plugins: [],
}
