/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink:   '#0E0E0E',
        slate: '#5A5A6E',
        mist:  '#F0EFF8',
        violet: { DEFAULT: '#4B3FCC', light: '#EAE8FA', dark: '#342C96' },
        signal: '#00C37A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cal Sans', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
