/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        pinnacle: {
          navy: '#0F2A44',
          yellow: '#F2B705',
          bg: '#F2F4F7',
          secondary: '#2E2E2E',
          text: '#1A1A1A',
        },
      },
      borderRadius: {
        'pinnacle-card': '4px',
        'pinnacle-input': '4px',
      },
      boxShadow: {
        pinnacle: '0 10px 25px rgba(0, 0, 0, 0.05)',
        'pinnacle-hover': '0 20px 40px rgba(15, 42, 68, 0.1)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
