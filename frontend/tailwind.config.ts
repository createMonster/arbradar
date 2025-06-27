import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
      fontFamily: {
        'sf': ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'system-ui', 'sans-serif'],
        'sf-mono': ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace'],
        'inter': ['var(--font-inter)', 'sans-serif'],
      },
  		colors: {
        // Italian Summer-inspired color palette
        italian: {
          // Primary: Lemon Yellow
          lemon: {
            50: '#FFFEF7',
            100: '#FFFBEB',
            200: '#FFF4C4',
            300: '#FFED9C',
            400: '#FFE74C',
            500: '#FFDD00', // Main lemon yellow
            600: '#E6C400',
            700: '#B8A000',
            800: '#8A7700',
            900: '#5C4E00',
          },
          // Primary: Sky Blue
          sky: {
            50: '#F0F9FF',
            100: '#E0F2FE',
            200: '#BAE6FD',
            300: '#7DD3FC',
            400: '#38BDF8',
            500: '#0EA5E9', // Main sky blue
            600: '#0284C7',
            700: '#0369A1',
            800: '#075985',
            900: '#0C4A6E',
          },
          // Warm accents
          sunset: {
            50: '#FFF8F1',
            100: '#FFEDD5',
            200: '#FED7AA',
            300: '#FDBA74',
            400: '#FB923C',
            500: '#F97316', // Warm orange
            600: '#EA580C',
            700: '#C2410C',
            800: '#9A3412',
            900: '#7C2D12',
          },
          coral: {
            50: '#FEF2F2',
            100: '#FEE2E2',
            200: '#FECACA',
            300: '#FCA5A5',
            400: '#F87171',
            500: '#EF4444', // Warm coral red
            600: '#DC2626',
            700: '#B91C1C',
            800: '#991B1B',
            900: '#7F1D1D',
          },
          sage: {
            50: '#F0FDF4',
            100: '#DCFCE7',
            200: '#BBF7D0',
            300: '#86EFAC',
            400: '#4ADE80',
            500: '#22C55E', // Mediterranean sage green
            600: '#16A34A',
            700: '#15803D',
            800: '#166534',
            900: '#14532D',
          },
          terra: {
            50: '#FDF4F3',
            100: '#FBE8E6',
            200: '#F7D1CE',
            300: '#F0AAA4',
            400: '#E7756B',
            500: '#D95448', // Terracotta
            600: '#C53E2C',
            700: '#A32F20',
            800: '#862B1D',
            900: '#6F291C',
          },
        },
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0A0A0A',
        },
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
  		borderRadius: {
        'xs': '0.125rem',
        'sm': '0.25rem', 
        'md': '0.375rem',
  			lg: '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
  		},
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'italian': '0 1px 3px 0 rgba(255, 221, 0, 0.1), 0 1px 2px 0 rgba(14, 165, 233, 0.06)',
        'italian-lg': '0 10px 15px -3px rgba(255, 221, 0, 0.1), 0 4px 6px -2px rgba(14, 165, 233, 0.05)',
        'italian-xl': '0 20px 25px -5px rgba(255, 221, 0, 0.1), 0 10px 10px -5px rgba(14, 165, 233, 0.04)',
        'warm': '0 4px 14px 0 rgba(249, 115, 22, 0.15)',
        'warm-lg': '0 10px 25px -5px rgba(249, 115, 22, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 221, 0, 0.2), 0 0 10px rgba(14, 165, 233, 0.1)' },
          '100%': { boxShadow: '0 0 20px rgba(255, 221, 0, 0.4), 0 0 30px rgba(14, 165, 233, 0.2)' },
        },
      },
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
