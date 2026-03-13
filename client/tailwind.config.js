import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FFF7ED',
        foreground: '#1F2937',
        muted: '#FDE68A',
        mutedFg: '#6B7280',
        accent: '#FB7185',
        accentFg: '#111827',
        secondary: '#5EEAD4',
        tertiary: '#60A5FA',
        quaternary: '#FBBF24',
        card: '#FFFFFF',
        border: '#111827',
        ring: '#FB7185',
      },
      fontFamily: {
        heading: ['Outfit', ...defaultTheme.fontFamily.sans],
        body: ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        sm: '0.75rem',
        md: '1.25rem',
        lg: '1.75rem',
        full: '9999px',
      },
      boxShadow: {
        pop: '4px 4px 0 0 rgba(17, 24, 39, 1)',
        'pop-hover': '6px 6px 0 0 rgba(17, 24, 39, 1)',
        'pop-press': '2px 2px 0 0 rgba(17, 24, 39, 1)',
        'pop-pink': '6px 6px 0 0 rgba(251, 113, 133, 1)',
        'pop-soft': '0 18px 40px rgba(17, 24, 39, 0.14)',
      },
      transitionTimingFunction: {
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        shake: {
          '0%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
          '100%': { transform: 'translateX(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.9) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        wiggle: 'wiggle 0.8s ease-in-out infinite',
        shake: 'shake 0.45s ease-in-out',
        'pop-in': 'pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
