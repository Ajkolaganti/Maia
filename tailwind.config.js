/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        glass: {
          light: 'rgba(31, 41, 55, 0.4)',
          medium: 'rgba(17, 24, 39, 0.6)',
          heavy: 'rgba(255, 255, 255, 0.2)',
        },
        dark: {
          glass: {
            light: 'rgba(24, 24, 27, 0.4)',
            medium: 'rgba(9, 9, 11, 0.6)',
            heavy: 'rgba(0, 0, 0, 0.2)',
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};