/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pinnacle: {
          primary: '#0F2A44',
          accent: '#F2B705',
          bg: '#F2F4F7',
          secondary: '#2E2E2E',
          text: '#1A1A1A',
        },
      },
      spacing: {
        8: '8px',
        16: '16px',
        24: '24px',
        32: '32px',
        80: '80px',
      },
      borderRadius: {
        'pinnacle-card': '8px',
        'pinnacle-input': '4px',
      },
      boxShadow: {
        pinnacle: '0 10px 25px rgba(0, 0, 0, 0.05)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
