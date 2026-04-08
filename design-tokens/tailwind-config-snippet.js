/** @type {import('tailwindcss').Config} */
module.exports = {
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
            dark: '#e07d3b',    // Shadow/Hover variant if needed
          },
          link: {
            DEFAULT: '#36afeb', // Default link blue
            hover: '#1e85c8',   // Darker blue for hover
          },
          neutral: {
            base: '#666666',    // Body text
            heading: '#333333', // Headings
            muted: '#999999',   // Small/Muted text
            emphasis: '#000000' // Strong text
          }
        }
      },
      fontFamily: {
        heading: ['Roboto', 'sans-serif'],
        body: ['"Nunito Sans"', 'sans-serif'],
      },
      fontSize: {
        // Base size is 16px (1rem in Tailwind)
        'h1-desktop': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
        'h1-mobile': ['34.2px', { lineHeight: '1.2', fontWeight: '700' }],
        'h2-desktop': ['28px', { lineHeight: '1.3', fontWeight: '700' }],
        'h3': ['22px', { lineHeight: '1.4', fontWeight: '700' }],
        'h4': ['20px', { lineHeight: '1.4', fontWeight: '700' }],
        'h5': ['18px', { lineHeight: '1.4', fontWeight: '700' }],
        'body': ['16px', { lineHeight: '1.6', fontWeight: '300' }],
      },
      spacing: {
        'ft-base': '20px',
        'ft-grid': '30px',
        'ft-block': '40px',
      },
      borderRadius: {
        'none': '0px',
      },
      boxShadow: {
        'ft-default': '0 2px 8px rgba(0,0,0,.08)',
      },
    }
  },
  plugins: [],
}
