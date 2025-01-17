/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}", "./app/**/**/*.{js,jsx,ts,tsx}", "./components/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-to-br': 'linear-gradient(to bottom right, var(--tw-gradient-stops))',
      },
      colors: {
        customGreen: {
          100: '#E4E4E4',
        },
        black: '#000000',
      },
    },
  },
  plugins: [],
}