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
        brand: {
          blue: {
            DEFAULT: '#abd5f4', // Primary brand color
            light: '#e1f0fb',   // Muted/Background variant
          },
          orange: {
            DEFAULT: '#ff9651', // Accent brand color
            dark: '#e07d3b',    // Shadow/Hover variant
          },
          link: {
            DEFAULT: '#36afeb', // Default link blue
            hover: '#1e85c8',   // Darker blue for hover
          },
          neutral: {
            base: '#666666',      // Body text
            heading: '#333333',   // Headings
            muted: '#999999',     // Small/Muted text
            emphasis: '#000000',  // Strong text
          },
        },
        product: {
          navy: {
            DEFAULT: '#1a365d',
            light: '#2c5282',
          },
          gold: {
            DEFAULT: '#d4af37',
            hover: '#b8860b',
          },
        },
      },
      fontFamily: {
        heading: ['var(--font-roboto)', 'sans-serif'],
        body: ['var(--font-nunito)', 'sans-serif'],
      },
      fontSize: {
        'h1-desktop': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
        'h1-mobile': ['34.2px', { lineHeight: '1.2', fontWeight: '700' }],
        'h2-desktop': ['28px', { lineHeight: '1.3', fontWeight: '700' }],
        h3: ['22px', { lineHeight: '1.4', fontWeight: '700' }],
        h4: ['20px', { lineHeight: '1.4', fontWeight: '700' }],
        h5: ['18px', { lineHeight: '1.4', fontWeight: '700' }],
        body: ['16px', { lineHeight: '1.6', fontWeight: '300' }],
      },
      spacing: {
        'ft-base': '20px',
        'ft-grid': '30px',
        'ft-block': '40px',
      },
      boxShadow: {
        'ft-default': '0 2px 8px rgba(0,0,0,.08)',
      },
      borderRadius: {
        none: '0px',
        'product-card': '12px',
      },
    },
  },
  plugins: [],
}

export default config
