/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'ripple': {
          '0%': {
            transform: 'translate(-50%, -50%) scale(1)',
          },
          '30%': {
            transform: 'translate(-50%, -50%) scale(0.5)',
          },
          '100%': {
            transform: 'translate(-50%, -50%) scale(1)',
          },
        },
        'shimmer-slide': {
          to: {
            transform: 'translateY(-120%)',
          },
        },
        'spin-around': {
          from: {
            transform: 'rotate(0deg)',
          },
          to: {
            transform: 'rotate(360deg)',
          },
        },
        'value-flash': {
          '0%': {
            color: 'inherit',
            textShadow: '0 0 0 rgba(255, 255, 255, 0)',
          },
          '30%': {
            color: 'white',
            textShadow: '0 0 8px rgba(255, 255, 255, 0.8)',
          },
          '100%': {
            color: 'inherit',
            textShadow: '0 0 0 rgba(255, 255, 255, 0)',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'ripple': 'ripple var(--duration, 12s) ease calc(var(--i, 0) * 0.2s) infinite',
        'shimmer-slide': 'shimmer-slide calc(var(--speed, 3s) * 1.5) infinite alternate ease-in-out',
        'spin-around': 'spin-around var(--speed, 3s) infinite linear',
        'value-flash': 'value-flash 0.7s ease-in-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
