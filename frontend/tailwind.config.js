/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          DEFAULT: '#00ff88',
          50: '#00ff8810',
          100: '#00ff8820',
          200: '#00ff8833',
          300: '#00ff8866',
          dim: '#00cc6a',
          glow: 'rgba(0, 255, 136, 0.15)',
        },
        dark: {
          DEFAULT: '#0a0a0a',
          50: '#0d0d0d',
          100: '#111111',
          200: '#141414',
          300: '#1a1a1a',
          400: '#222222',
          500: '#2a2a2a',
          600: '#333333',
          700: '#555555',
          800: '#888888',
          900: '#cccccc',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-neon': 'linear-gradient(135deg, rgba(0, 255, 136, 0.4) 0%, rgba(0, 255, 136, 0) 50%)',
        'gradient-neon-border': 'linear-gradient(135deg, rgba(0, 255, 136, 0.6), rgba(0, 255, 136, 0.05) 50%, transparent)',
        'dot-grid': 'radial-gradient(circle, rgba(0, 255, 136, 0.08) 1px, transparent 1px)',
        'fine-grid': 'linear-gradient(rgba(0, 255, 136, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.04) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '24px 24px',
        'fine-grid': '40px 40px',
      },
      boxShadow: {
        neon: '0 0 15px rgba(0, 255, 136, 0.15)',
        'neon-lg': '0 0 30px rgba(0, 255, 136, 0.2)',
        'neon-xl': '0 0 60px rgba(0, 255, 136, 0.25)',
        'neon-inner': 'inset 0 0 20px rgba(0, 255, 136, 0.08)',
        glow: '0 0 20px rgba(0, 255, 136, 0.3), 0 0 40px rgba(0, 255, 136, 0.1)',
        'glow-sm': '0 0 10px rgba(0, 255, 136, 0.2)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '12px',
        'glass-lg': '20px',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2.5s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 15px rgba(0, 255, 136, 0.15), 0 0 30px rgba(0, 255, 136, 0.05)',
          },
          '50%': {
            boxShadow: '0 0 25px rgba(0, 255, 136, 0.35), 0 0 50px rgba(0, 255, 136, 0.1)',
          },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0, 255, 136, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 255, 136, 0.45)' },
        },
      },
      borderRadius: {
        glass: '12px',
      },
    },
  },
  plugins: [],
}
