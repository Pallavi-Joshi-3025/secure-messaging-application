/** @type {import('tailwindcss').Config} */
// Design tokens: change colours/fonts here and every screen updates.
module.exports = {
  content: ['./pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0F766E', dark: '#115E59', soft: '#E0F2F1' },
        ink: '#0F172A',
        ground: '#F6F7F9',
        warn: '#B45309',
        danger: '#B91C1C',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
