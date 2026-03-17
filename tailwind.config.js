/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        claude: {
          orange: '#E07A3A',
          'orange-light': '#F4A261',
          'orange-dim': '#C96A30',
          bg: {
            light: '#F7F3E6',
            dark: '#1A1A1A',
          },
          surface: {
            light: '#FFFDF6',
            dark: '#242424',
          },
          sidebar: {
            light: '#EEE7D3',
            dark: '#1E1E1E',
          },
          text: {
            light: '#2A2923',
            dark: '#D4D4D4',
          },
          border: {
            light: '#D9D1BC',
            dark: '#3A3A3A',
          },
          muted: {
            light: '#8A846F',
            dark: '#808080',
          },
        },
      },
    },
  },
  plugins: [],
};
