/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B2733',
        chalk: '#F2F4F6',
        line: '#D5DBE1',
        muted: '#5B6775',
        // Weight-plate colour code, reused for statuses.
        plate: { blue: '#1F5FBF', red: '#D2382E', yellow: '#E9B20F', green: '#2F8F5B' },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
