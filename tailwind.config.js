/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        cream: "#FAF6F0",
        navy: {
          DEFAULT: "#1E3A5F",
          deep: "#172033",
        },
        teal: {
          DEFAULT: "#2E9C8A",
          light: "#34A897",
        },
        rays: "#F5C24B",
        muted: "#6B7280",
      },
    },
  },
  plugins: [],
};
