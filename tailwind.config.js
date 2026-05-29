/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:     '#000000',
        fg:     '#f3efe7',
        dim:    '#7a766e',
        accent: '#e7c265',
        line:   '#1a1a1a',
      },
      fontFamily: {
        mono:  ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      animation: {
        pulse2: 'pulse2 2s infinite',
      },
      keyframes: {
        pulse2: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
}
