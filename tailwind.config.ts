import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#09090b',
        surface: '#18181b',
        accent: '#22d3ee',
        text: '#fafafa'
      }
    }
  },
  plugins: []
};

export default config;
