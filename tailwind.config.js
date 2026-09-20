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
          DEFAULT: "#7A1420",
          light: "#FC4B54",
          deep: "#26050C",
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
        track: "#EDE7DE",
        surfaceDark: "#3A0F1A",
      },
    },
  },
  plugins: [],
};
