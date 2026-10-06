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
        // /bp/ design system — warmed ink base + phosphor-green primary
        bg:     '#101012',   // ink-850 — page bg
        fg:     '#f4f0e8',   // cream — primary text
        dim:    '#9a958b',   // dim-1 — secondary text
        dim2:   '#6f6b62',   // dim-2 — metadata / mono labels
        accent: '#57d36a',   // green — PRIMARY (phosphor)
        line:   '#26262b',   // ink-600 — strong border
        ink: {
          900: '#0c0c0e',
          850: '#101012',
          800: '#161619',
          700: '#1d1d21',
          600: '#26262b',
          500: '#34343a',
        },
        cream:       '#f4f0e8',
        'cream-dim': '#cbc6bc',
        'green-deep':'#2f9d44',
        lime:    '#c7ee5e',
        coral:   '#ec9576',
        magenta: '#e63b6d',
        violet:  '#9b8cff',
      },
      fontFamily: {
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        serif:   ['"Bricolage Grotesque"', '"Helvetica Neue"', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"Helvetica Neue"', 'sans-serif'],
      },
      animation: {
        pulse2: 'pulse2 2s infinite',
        caret: 'caret 1.05s steps(1) infinite',
        'cue-in': 'cue-in 900ms ease-out 2s both',
        'cue-nudge': 'cue-nudge 2.4s ease-in-out infinite',
      },
      keyframes: {
        pulse2: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        caret: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        'cue-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        // Chevron dips 5px once per cycle, then rests.
        'cue-nudge': {
          '0%, 55%, 100%': { transform: 'translateY(0)' },
          '28%': { transform: 'translateY(5px)' },
        },
      },
    },
  },
  plugins: [],
}
