/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        splatoon: {
          yellow: '#ffff00',
          pink: '#ff69b4',
          cyan: '#00ffff',
          orange: '#ff8c00',
          purple: '#9966cc',
          green: '#32cd32'
        },
        match: {
          turf: '#cff622',
          bankara: '#f54910',
          x: '#0ba474'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}