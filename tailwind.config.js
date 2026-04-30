/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'green-deep': '#1a3d2e',
        'green-mid': '#2d6a4f',
        'green-light': '#52b788',
        'cream': '#f8f3ea',
        'cream-dark': '#efe8d8',
        'gold': '#C9E265',
        'gold-light': '#D8F085',
        'text-dark': '#1c2b22',
        'text-mid': '#4a5e52',
        'white': '#ffffff',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.text-mid'),
            h1: { color: theme('colors.green-deep') },
            h2: { color: theme('colors.green-deep') },
            h3: { color: theme('colors.green-deep') },
            h4: { color: theme('colors.green-deep') },
            strong: { color: theme('colors.text-dark') },
            a: { color: theme('colors.green-mid') },
            ul: { listStyleType: 'disc', paddingLeft: theme('spacing.5') },
            ol: { listStyleType: 'decimal', paddingLeft: theme('spacing.5') },
            li: { marginTop: theme('spacing.1'), marginBottom: theme('spacing.1') },
          },
        },
      }),
      fontFamily: {
        'dm-sans': ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        'custom': '0 8px 40px rgba(26,61,46,0.12)',
        'custom-hover': '0 16px 60px rgba(26,61,46,0.22)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease',
        'pulse': 'pulse 2s infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out infinite 2s',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
