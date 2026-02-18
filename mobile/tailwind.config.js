/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f4eb',
          100: '#b3dfc4',
          200: '#80ca9d',
          300: '#4db576',
          400: '#26a45a',
          500: '#01722f',
          600: '#016628',
          700: '#015521',
          800: '#01441a',
          900: '#003310',
          950: '#002209',
          DEFAULT: '#01722f',
        },
        secondary: {
          50: '#fef9f0',
          100: '#fdf5e9',
          200: '#fbedd4',
          300: '#f8e2ba',
          400: '#f5d7a0',
          500: '#faf5e9',
          DEFAULT: '#faf5e9',
        },
        accent: {
          DEFAULT: '#e13c30',
          light: '#f5706a',
          dark: '#b82d23',
        },
        cta: {
          DEFAULT: '#ffcc00',
          light: '#ffe066',
          dark: '#cc9900',
          hover: '#e6b800',
        },
        // Domain brand colors
        commissary: '#E07A2F',
        'frozen-goods': '#2563EB',
        // Semantic
        success: { light: '#d4edda', DEFAULT: '#28a745', dark: '#155724' },
        warning: { light: '#fff3cd', DEFAULT: '#ffc107', dark: '#856404' },
        error: { light: '#f8d7da', DEFAULT: '#dc3545', dark: '#721c24' },
        info: { light: '#d1ecf1', DEFAULT: '#17a2b8', dark: '#0c5460' },
      },
      fontFamily: {
        heading: ['Poppins_700Bold'],
        body: ['Poppins_400Regular'],
        'body-medium': ['Poppins_500Medium'],
        'body-semibold': ['Poppins_600SemiBold'],
      },
      borderRadius: {
        button: 22.5,
        card: 12,
        input: 8,
        modal: 16,
      },
    },
  },
  plugins: [],
}
