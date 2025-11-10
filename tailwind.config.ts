import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef3e7',
          100: '#fce4c4',
          200: '#f9d49d',
          300: '#f7c376',
          400: '#f5b759',
          500: '#f3ab3c',
          600: '#f1a336',
          700: '#ef992e',
          800: '#ed8f27',
          900: '#ea7d1a',
        },
        secondary: {
          50: '#e8f5e9',
          100: '#c8e6c9',
          200: '#a5d6a7',
          300: '#81c784',
          400: '#66bb6a',
          500: '#4caf50',
          600: '#43a047',
          700: '#388e3c',
          800: '#2e7d32',
          900: '#1b5e20',
        },
      },
    },
  },
  plugins: [],
};
export default config;
