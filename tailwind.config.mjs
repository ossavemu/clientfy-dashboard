/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        starlight: {
          primary: '#7c3aed',
          secondary: '#5b21b6',
          accent: '#c4b5fd',
          background: '#f8fafc',
          text: '#1e293b',
          border: '#e2e8f0'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}