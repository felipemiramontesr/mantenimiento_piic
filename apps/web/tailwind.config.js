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
          white: '#F8FAFC',
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
      fontSize: {
        'archon-xs': ['8px', { lineHeight: '1.2' }],
        'archon-sm': ['9px', { lineHeight: '1.3' }],
        'archon-base': ['10px', { lineHeight: '1.4' }],
        'archon-md': ['11px', { lineHeight: '1.4' }],
        'archon-lg': ['13px', { lineHeight: '1.5' }],
        'archon-xl': ['14px', { lineHeight: '1.5' }],
      },
    },
  },
  plugins: [],
};
