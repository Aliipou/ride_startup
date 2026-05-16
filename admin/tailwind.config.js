/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B9E77',
          50: '#E8F8F3',
          100: '#C4EDE0',
          200: '#8FDCC5',
          300: '#5ACBAA',
          400: '#2FBA90',
          500: '#1B9E77',
          600: '#15795B',
          700: '#0F5440',
          800: '#092F24',
          900: '#030A08',
        },
        dark: '#111827',
        accent: {
          DEFAULT: '#F59E0B',
          50: '#FEF9EC',
          100: '#FDF0C8',
          200: '#FBE08F',
          300: '#F8CE56',
          400: '#F6BB1E',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
    },
  },
  plugins: [],
};
