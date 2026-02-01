import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'moss-green': '#1F4A0C',
        'moss-light': '#2D5016',
        'moss-dark': '#16320A',
        'forest-green': '#0F3808',
        'warm-brown': '#8B4513',
        'earth-brown': '#6B3410',
        'light-green': '#A8E6A3',
        'sage-green': '#8FBC8F',
        'beige': '#F5F5DC',
        'cream': '#FFF8DC',
        'light-blue': '#F8F8FF',
        'nature-gray': '#6B7280',
        /* globals.css の変数と連動（基本・フォームの文字色） */
        ink: 'var(--color-text-base)',
        muted: 'var(--color-text-muted)',
        'form-text': 'var(--color-form-text)',
        'form-bg': 'var(--color-form-bg)',
        'form-border': 'var(--color-form-border)',
        'form-placeholder': 'var(--color-form-placeholder)',
      },
      fontFamily: {
        'sans': ['Noto Sans JP', 'system-ui', 'sans-serif'],
        'inter': ['Inter', 'system-ui', 'sans-serif'],
        'handwriting': ['Kalam', 'Caveat', 'Dancing Script', 'cursive'],
        'nature': ['Merriweather', 'Lora', 'Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config