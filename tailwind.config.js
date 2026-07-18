/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#0A0A0A',
        'bg-card': '#141414',
        'bg-card-2': '#1C1C1E',
        'accent-red': '#FF3B5C',
        'accent-cyan': '#00C6D7',
        'accent-purple': '#7B2FFF',
        'text-primary': '#FFFFFF',
        'text-secondary': '#A0A0A0',
        success: '#00D48A',
        warning: '#FFB800',
        border: '#2A2A2A',
      },
      fontFamily: {
        inter: ['Inter_400Regular'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
        'inter-extrabold': ['Inter_800ExtraBold'],
      },
    },
  },
  plugins: [],
};
