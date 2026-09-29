/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: "#0B1220",
        brand: {
          DEFAULT: "#16A085",
          dark: "#0F6E5C",
          light: "#E8F7F3",
        },
        status: {
          pending: "#E4574C",
          progress: "#E0A93E",
          done: "#2FAE66",
        },
      },
    },
  },
  plugins: [],
};
