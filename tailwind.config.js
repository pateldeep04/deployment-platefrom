/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        card: '#FFFFFF',
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#3B82F6',
          dark: '#1E40AF',
        },
        accent: {
          DEFAULT: '#0284C7',
          hover: '#0369A1',
          light: '#38BDF8',
        },
        deployText: {
          DEFAULT: '#0F172A',
          secondary: '#475569',
          muted: '#64748B',
        },
        deployBorder: {
          DEFAULT: '#E2E8F0',
          light: '#CBD5E1',
          subtle: '#F1F5F9',
        },
        success: '#16A34A',
        warning: '#D97706',
        error: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 4px 14px 0 rgba(37, 99, 235, 0.25)',
        'glow-accent': '0 4px 14px 0 rgba(2, 132, 199, 0.25)',
        'card-dark': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
