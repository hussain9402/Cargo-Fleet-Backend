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
        // Brand: #0045DD (accent) + #010000 (ink / canvas)
        brand: {
          50: '#F4F6FB',
          100: '#E8EDFA',
          200: '#C5D0F5',
          300: '#8FA3EB',
          400: '#3D6AE8',
          500: '#0045DD', // primary accent
          600: '#0038B5',
          700: '#002C8F',
          800: '#121212', // card / elevated surface
          900: '#010000', // canvas / near-black
          950: '#000000',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.08)' },
        },
        drift: {
          '0%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(2%, -1.5%, 0)' },
          '100%': { transform: 'translate3d(0,0,0)' },
        },
        'pin-pop': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.6)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'truck-drive': {
          '0%': { left: '0%', transform: 'translate(-100%, 0)' },
          '100%': { left: '100%', transform: 'translate(0%, 0)' },
        },
        'road-dash': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-28px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in': 'fade-in 0.7s ease forwards',
        float: 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 3.5s ease-in-out infinite',
        drift: 'drift 18s ease-in-out infinite',
        'pin-pop': 'pin-pop 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'truck-drive': 'truck-drive 1.8s cubic-bezier(0.45, 0.05, 0.25, 1) forwards',
        'road-dash': 'road-dash 0.45s linear infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
export default config;