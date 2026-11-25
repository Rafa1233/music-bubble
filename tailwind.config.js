/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
        'orb-float-1': 'orbFloat1 22s ease-in-out infinite',
        'orb-float-2': 'orbFloat2 28s ease-in-out infinite',
        'orb-float-3': 'orbFloat3 25s ease-in-out infinite',
        'aurora-shift': 'auroraShift 18s ease-in-out infinite alternate',
      },
      keyframes: {
        orbFloat1: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(60px, -40px) scale(1.12)' },
          '66%': { transform: 'translate(-35px, 50px) scale(0.92)' },
        },
        orbFloat2: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(-70px, 35px) scale(1.08)' },
          '66%': { transform: 'translate(45px, -55px) scale(0.95)' },
        },
        orbFloat3: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(40px, 45px) scale(1.15)' },
        },
        auroraShift: {
          '0%': { transform: 'translateX(-8%) rotate(-3deg) scale(1)' },
          '100%': { transform: 'translateX(8%) rotate(3deg) scale(1.1)' },
        },
      },
    },
  },
  plugins: [],
};
