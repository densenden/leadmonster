// Tailwind config derived from finanzteam26.de brand reference + design-tokens/tokens.json
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Primary brand palette (from finanzteam26.de) ──────────────
        cyan: {
          DEFAULT: '#02a9e6',   // brand cyan — icons, buttons, links, accents
          light:   '#e1f0fb',   // soft cyan — section backgrounds, tags
          dark:    '#0189bc',   // darker cyan — hover states
        },
        orange: {
          DEFAULT: '#f26522',   // brand orange — CTAs, the "26", badges
          dark:    '#d4511a',   // orange hover
        },
        navy: {
          DEFAULT: '#1a3252',   // dark navy — headings, nav, footer
          mid:     '#2c5282',   // mid navy — secondary surfaces
          light:   '#e1f0fb',   // light navy alias (== cyan-light)
        },
        // ── Text ───────────────────────────────────────────────────────
        body:    '#4a5568',
        muted:   '#718096',
        // ── Semantic shortcuts ─────────────────────────────────────────
        brand: {
          primary:  '#02a9e6',
          secondary:'#f26522',
          dark:     '#1a3252',
          light:    '#e1f0fb',
        },
        // ── Kept for backwards compat on product pages ─────────────────
        product: {
          navy: {
            DEFAULT: '#1a3252',
            light:   '#2c5282',
          },
          gold: {
            DEFAULT: '#d4af37',
            hover:   '#b8860b',
          },
        },
      },

      fontFamily: {
        heading: ['var(--font-roboto)', 'Roboto', 'sans-serif'],
        body:    ['var(--font-nunito)', 'Nunito Sans', 'sans-serif'],
        sans:    ['var(--font-nunito)', 'Nunito Sans', 'sans-serif'],
      },

      fontSize: {
        'h1': ['36px',  { lineHeight: '1.15', fontWeight: '700' }],
        'h1-sm': ['28px', { lineHeight: '1.2',  fontWeight: '700' }],
        'h2': ['28px',  { lineHeight: '1.2',  fontWeight: '700' }],
        'h2-sm': ['22px', { lineHeight: '1.25', fontWeight: '700' }],
        'h3': ['22px',  { lineHeight: '1.3',  fontWeight: '700' }],
        'h4': ['18px',  { lineHeight: '1.4',  fontWeight: '700' }],
        'h5': ['16px',  { lineHeight: '1.4',  fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.7',  fontWeight: '300' }],
        'sm':  ['14px',  { lineHeight: '1.5',  fontWeight: '400' }],
      },

      spacing: {
        'section-sm': '40px',
        'section':    '70px',
        'section-lg': '100px',
        'section-xl': '140px',
      },

      maxWidth: {
        'content': '1200px',
      },

      borderRadius: {
        sm:   '4px',
        DEFAULT: '6px',
        md:   '8px',
        lg:   '12px',
        xl:   '16px',
      },

      boxShadow: {
        sm:  '0 1px 3px rgba(0,0,0,.08)',
        md:  '0 4px 12px rgba(0,0,0,.10)',
        lg:  '0 8px 24px rgba(0,0,0,.12)',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease forwards',
      },
    },
  },
  plugins: [],
}

export default config
