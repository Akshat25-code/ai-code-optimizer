// tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkEditor: "#1e1e2f",
        lightText: "#ffffffde",
        accent: "#14b8a6", // teal-500
        primary: "#0d9488", // teal-600
        secondary: "#0f766e", // teal-700
      },
      fontFamily: {
        mono: ["Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};