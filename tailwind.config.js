/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: "#1d2735",
        light: "#d5f4f5",
        white: "#ffffff",
        primary: "#6895be",
        secondary: "#e84f28", // Replace with your secondary color
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "Roboto Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
