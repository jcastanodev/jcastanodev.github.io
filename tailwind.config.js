/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./index.js","./en/**/*.{html,js}","./blog/**/*.{html,js}","./features/**/*.{html,js}"],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    'mt-8',
  ]
}
