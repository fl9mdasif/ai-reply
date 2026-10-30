import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#000000',
          violet: '#7D39EB',
          lime: '#C6FF33',
          white: '#FFFFFF',
        },
        dash: {
          bg: '#F8F7FF',
          border: '#EDE9FE',
          text: '#09090B',
          sidebar: '#FFFFFF',
          'sidebar-active': '#F3F0FF',
        },
        status: {
          confirmed: '#22C55E',
          risk: '#EF4444',
          pending: '#F59E0B',
          cancelled: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
