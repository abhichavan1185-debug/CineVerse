/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          DEFAULT: "#e50914",
          500: "#e50914",
          600: "#dc2626",
          700: "#b91c1c",
          dark: "#991b1b",
          800: "#7f1d1d",
          900: "#450a0a",
        },
        gold: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          DEFAULT: "#f59e0b",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
        platinum: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          DEFAULT: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
        ink: "#0f172a",
        surface: "#f8fafc",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        heading: ["'Outfit'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "18px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 2px 14px rgba(15, 23, 42, 0.07)",
        glow: "0 0 25px rgba(229, 9, 20, 0.35)",
        goldGlow: "0 0 20px rgba(245, 158, 11, 0.3)",
      },
    },
  },
  plugins: [],
};
