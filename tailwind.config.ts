import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1E3A8A',
          dark: '#172554',
          light: '#EFF6FF',
          accent: '#3B82F6',
        },
        surface: '#F9FAFB',
        border: '#E5E7EB',
        'border-dark': '#D1D5DB',
        'text-primary': '#111827',
        'text-secondary': '#6B7280',
        'text-muted': '#9CA3AF',
        success: '#059669',
        danger: '#DC2626',
        warning: '#D97706',
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
    },
  },
  plugins: [],
}
export default config
