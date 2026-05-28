import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        blue: {
          primary: '#1E3A8A',
          dark: '#172554',
          accent: '#60A5FA',
        },
        'off-white': '#F8FAFC',
        subtle: '#F1F5F9',
        border: '#E2E8F0',
        ink: '#0F172A',
        muted: '#64748B',
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
export default config
