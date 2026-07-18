import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
      },
      colors: {
        blue: {
          400: '#2589FE',
          500: '#0070F3',
          600: '#2F6FEB',
        },
        // Admin console palette (teal)
        brand: {
          50: '#F3F4F4',
          100: '#E1EAEB',
          200: '#C3DBDC',
          300: '#9AC4C6',
          400: '#7FB4B7',
          500: '#5F9598', // accent
          600: '#4E7E81',
          700: '#1D546D', // deep teal
          800: '#0A2A38', // card surface
          900: '#061E29', // canvas
          950: '#041016', // sidebar / deepest
        },
      },
    },
    keyframes: {
      shimmer: {
        '100%': {
          transform: 'translateX(100%)',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
export default config;
