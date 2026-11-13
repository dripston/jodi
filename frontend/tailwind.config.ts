import type { Config } from 'tailwindcss';

const v = (name: string) => `var(--${name})`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      bg: v('bg'),
      surface: { DEFAULT: v('surface'), muted: v('surface-muted') },
      border: { DEFAULT: v('border'), strong: v('border-strong') },
      text: { DEFAULT: v('text'), muted: v('text-muted'), subtle: v('text-subtle') },
      brand: { DEFAULT: v('brand'), soft: v('brand-soft') },
      focus: v('focus'),
      overlay: 'rgb(28 25 23 / 0.24)',
      red: { fg: v('red-fg'), bg: v('red-bg'), border: v('red-border') },
      amber: { fg: v('amber-fg'), bg: v('amber-bg'), border: v('amber-border') },
      green: { fg: v('green-fg'), bg: v('green-bg'), border: v('green-border') },
      info: { fg: v('info-fg'), bg: v('info-bg') },
    },
    fontFamily: {
      sans: ['Inter', '"Noto Sans Kannada"', 'system-ui', 'sans-serif'],
      kannada: ['"Noto Sans Kannada"', 'Inter', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
    },
    fontSize: {
      display: ['2rem', { lineHeight: '2.375rem', fontWeight: '600', letterSpacing: '-0.025em' }],
      title: ['1.75rem', { lineHeight: '2.125rem', fontWeight: '600', letterSpacing: '-0.02em' }],
      h1: ['1.5rem', { lineHeight: '1.875rem', fontWeight: '600', letterSpacing: '-0.015em' }],
      h2: ['1.0625rem', { lineHeight: '1.5rem', fontWeight: '600', letterSpacing: '-0.01em' }],
      h3: ['0.9375rem', { lineHeight: '1.375rem', fontWeight: '600', letterSpacing: '-0.005em' }],
      'body-lg': ['0.9375rem', { lineHeight: '1.5rem' }],
      body: ['0.875rem', { lineHeight: '1.3125rem' }],
      small: ['0.8125rem', { lineHeight: '1.1875rem' }],
      caption: ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
      eyebrow: ['0.75rem', { lineHeight: '1rem', fontWeight: '500', letterSpacing: '0.01em' }],
    },
    borderRadius: {
      none: '0',
      sm: v('radius-sm'),
      DEFAULT: v('radius'),
      lg: v('radius-lg'),
      full: '9999px',
    },
    boxShadow: {
      none: 'none',
      popover: '0 4px 16px rgba(0,0,0,0.08)',
      overlay: '0 12px 40px rgba(0,0,0,0.12)',
      raised: '0 1px 2px rgba(26,25,23,0.04)',
      'urgent-row': 'inset 3px 0 0 var(--red-fg)',
    },
    extend: {
      spacing: { 0.75: '0.1875rem', 4.5: '1.125rem', 13: '3.25rem', 15: '3.75rem', 18: '4.5rem', 120: '30rem' },
      maxWidth: { content: '1280px', prose: '42rem' },
      width: { sidebar: '240px', drawer: '480px', rail: '320px' },
      transitionTimingFunction: { standard: 'cubic-bezier(0.2, 0, 0, 1)' },
      transitionDuration: { 120: '120ms', 180: '180ms', 240: '240ms' },
      keyframes: {
        'entry-in': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        highlight: {
          from: { backgroundColor: 'var(--brand-soft)' },
          to: { backgroundColor: 'transparent' },
        },
        'ring-pulse': {
          from: { boxShadow: '0 0 0 0 var(--red-fg)' },
          to: { boxShadow: '0 0 0 8px transparent' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        pulse: { '50%': { opacity: '0.5' } },
      },
      animation: {
        'entry-in': 'entry-in 240ms cubic-bezier(0.2, 0, 0, 1), highlight 1.5s ease-out 240ms',
        'ring-pulse': 'ring-pulse 600ms cubic-bezier(0.2, 0, 0, 1) 1',
        'fade-in': 'fade-in 180ms cubic-bezier(0.2, 0, 0, 1)',
        'slide-in-right': 'slide-in-right 240ms cubic-bezier(0.2, 0, 0, 1)',
        pulse: 'pulse 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
