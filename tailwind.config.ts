import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: 'hsl(228, 20%, 9%)' },
        surface: {
          DEFAULT: 'hsl(228, 18%, 14%)',
          2: 'hsl(228, 16%, 18%)',
          3: 'hsl(228, 14%, 22%)',
        },
        border: { DEFAULT: 'hsl(228, 12%, 26%)' },
        text: { DEFAULT: '#e4e6ef', muted: '#8b90a5' },
        accent: {
          DEFAULT: '#5b8def',
          hover: '#6e9cf2',
          glow: 'rgba(91, 141, 239, 0.15)',
        },
        success: '#00c853',
        danger: '#ff5252',
        recording: '#ff3b3b',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"Cascadia Code"', '"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        base: ['12px', { lineHeight: '1.5' }],
        xs: ['10px', { lineHeight: '1.4' }],
        sm: ['11px', { lineHeight: '1.5' }],
        md: ['13px', { lineHeight: '1.5' }],
        lg: ['14px', { lineHeight: '1.5' }],
        xl: ['16px', { lineHeight: '1.4' }],
        '2xl': ['22px', { lineHeight: '1.3' }],
      },
      width: {
        sidebar: '220px',
      },
      borderRadius: {
        card: '6px',
      },
      spacing: {
        card: '10px',
      },
      animation: {
        'pulse-recording': 'pulse 1.5s ease-in-out infinite',
        'recording-ring': 'recording-ring 1.5s ease-out infinite',
        'slide-down': 'slide-down 0.3s ease-out',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'recording-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
