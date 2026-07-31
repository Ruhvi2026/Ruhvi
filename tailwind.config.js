/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FAF7ED',
          100: '#F3EBCF',
          200: '#E7D7A3',
          300: '#DBC377',
          400: '#CFA74B',
          500: '#C29831',
          600: '#9E7924',
          700: '#795B19',
          800: '#553E10',
          900: '#332307',
        },
        cream: {
          50: '#FDFBF7',
          100: '#FAF6ED',
          200: '#F5ECDA',
          300: '#EDE0C5',
        },
        charcoal: {
          800: '#1C1B1A',
          900: '#121110',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif'],
      },
    },
  },
  plugins: [],
}
