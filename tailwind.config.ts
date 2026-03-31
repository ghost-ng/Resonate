import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: 'var(--color-bg)' },
        surface: {
          DEFAULT: 'var(--color-surface)',
          2: 'var(--color-surface-2)',
          3: 'var(--color-surface-3)',
        },
        border: { DEFAULT: 'var(--color-border)' },
        text: { DEFAULT: 'var(--color-text)', muted: 'var(--color-text-muted)' },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          glow: 'var(--color-accent-glow)',
        },
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        recording: 'var(--color-recording)',
        info: 'var(--color-info)',
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
