/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        brand: {
          red: '#E8352A',
          'red-dim': '#3D1210',
          amber: '#F5A623',
          'amber-dim': '#3D2A09',
          green: '#1DB954',
          'green-dim': '#0A2E16',
          blue: '#2D9CDB',
          'blue-dim': '#0A1F2E',
        },
        surface: {
          DEFAULT: '#0D0D0F',
          2: '#141417',
          3: '#1C1C21',
          4: '#252529',
        },
      },
      animation: {
        'sos-pulse': 'sos-pulse 2s ease-in-out infinite',
        'dot-pulse': 'dot-pulse 1.4s ease-in-out infinite',
        'amb-move': 'amb-move 6s linear infinite',
      },
      keyframes: {
        'sos-pulse': {
          '0%, 100%': { boxShadow: '0 0 40px rgba(232,53,42,0.5)' },
          '50%': { boxShadow: '0 0 70px rgba(232,53,42,0.8)' },
        },
        'dot-pulse': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.4, transform: 'scale(0.75)' },
        },
      },
    },
  },
  plugins: [],
}
