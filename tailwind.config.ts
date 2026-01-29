import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				cinema: [
					'TEKO',
					'sans-serif'
				],
				body: [
					'Manrope',
					'sans-serif'
				],
				sans: [
					'Manrope',
					'ui-sans-serif',
					'system-ui',
					'sans-serif',
					'Apple Color Emoji',
					'Segoe UI Emoji',
					'Segoe UI Symbol',
					'Noto Color Emoji'
				],
				serif: [
					'ui-serif',
					'Georgia',
					'Cambria',
					'Times New Roman',
					'Times',
					'serif'
				],
				mono: [
					'ui-monospace',
					'SFMono-Regular',
					'Menlo',
					'Monaco',
					'Consolas',
					'Liberation Mono',
					'Courier New',
					'monospace'
				]
			},
			fontSize: {
				'xl': ['clamp(1.125rem, 1.04vw, 1.25rem)', { lineHeight: '1.75rem' }],
				'2xl': ['clamp(1.25rem, 1.25vw, 1.5rem)', { lineHeight: '2rem' }],
				'3xl': ['clamp(1.5rem, 1.56vw, 1.875rem)', { lineHeight: '2.25rem' }],
				'4xl': ['clamp(1.75rem, 1.875vw, 2.25rem)', { lineHeight: '2.5rem' }],
				'5xl': ['clamp(2.25rem, 2.5vw, 3rem)', { lineHeight: '1' }],
				'6xl': ['clamp(3rem, 3.125vw, 3.75rem)', { lineHeight: '1' }],
				'7xl': ['clamp(3.75rem, 3.75vw, 4.5rem)', { lineHeight: '1' }],
				'8xl': ['clamp(4.5rem, 5vw, 6rem)', { lineHeight: '1' }]
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				cinema: {
					yellow: 'hsl(var(--cinema-yellow))',
					'yellow-dark': 'hsl(var(--cinema-yellow-dark))',
					black: 'hsl(var(--cinema-black))',
					gray: 'hsl(var(--cinema-gray))',
					ivory: 'hsl(var(--cinema-ivory))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
