/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        cream: "#FAF6F0",
        brand: {
          DEFAULT: "#1A344E",
          light: "#0B84F5",
          deep: "#0C1824",
        },
        teal: {
          DEFAULT: "#2E9C8A",
          light: "#34A897",
        },
        muted: "#6B7280",
        mutedDark: "#94A3B8",
        plum: "#8B5CF6",
        mint: "#22A559",
        coral: "#E5484D",
        track: "#E8EDF2",
        surfaceDark: "#132030",
      },
    },
  },
  plugins: [],
};
