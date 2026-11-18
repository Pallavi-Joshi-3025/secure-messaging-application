/** @type {import('tailwindcss').Config} */
// Design tokens (theme "Keys and locks"): change colours/fonts here and every screen updates.
module.exports = {
  content: ['./pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme: "Keys and locks" — cream + steel blue
        primary: { DEFAULT: '#2F5D8A', dark: '#23486C', soft: '#E3ECF5' },
        ink: '#0F172A',
        ground: '#F7F5F0',
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
