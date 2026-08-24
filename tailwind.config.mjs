/** @type {import('tailwindcss').Config} */
// Tailwind is scoped to the games under src/games — their stylesheets (and the
// preflight reset) are imported only by the matching game pages, so the rest of
// the site is unaffected.
export default {
  content: ['./src/games/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: '#14161a',
        'charcoal-2': '#1c1f25',
        felt: '#0e2a1f',
        'felt-deep': '#0a1f17',
        brass: '#C9A24B',
        'brass-dim': '#9a7c3a',
        bone: '#f4efe2',
        'pip-red': '#b3262b',
        'pip-black': '#1a1a1a',
        emerald: '#2f9e6f',
        'player-blue': '#3a6ea5',
        'banker-red': '#b3262b',
        'tie-green': '#2f9e6f',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 6px 18px rgba(0,0,0,0.45)',
        chip: '0 3px 8px rgba(0,0,0,0.5)',
      },
      keyframes: {
        dealIn: {
          '0%': { transform: 'translateY(-40px) translateX(60px) rotate(8deg)', opacity: '0' },
          '100%': { transform: 'translateY(0) translateX(0) rotate(0)', opacity: '1' },
        },
        flip: {
          '0%': { transform: 'rotateY(90deg)', opacity: '0.3' },
          '100%': { transform: 'rotateY(0)', opacity: '1' },
        },
        popIn: {
          '0%': { transform: 'scale(0.4)', opacity: '0' },
          '70%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        chipFly: {
          '0%': { transform: 'translateY(20px) scale(0.8)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        squeezeHint: {
          '0%, 100%': { transform: 'translateY(0) rotate(0)' },
          '50%': { transform: 'translateY(-4px) rotate(-1.2deg)' },
        },
        winnerGlow: {
          '0%, 100%': { boxShadow: '0 0 0 2px rgba(201,162,75,0.55), 0 0 14px rgba(201,162,75,0.15)' },
          '50%': { boxShadow: '0 0 0 2px rgba(201,162,75,0.9), 0 0 30px rgba(201,162,75,0.5)' },
        },
        countPop: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        dealIn: 'dealIn 0.32s cubic-bezier(0.2,0.8,0.2,1) both',
        flip: 'flip 0.28s ease-out both',
        popIn: 'popIn 0.3s cubic-bezier(0.2,0.8,0.2,1) both',
        chipFly: 'chipFly 0.25s ease-out both',
        squeezeHint: 'squeezeHint 1.1s ease-in-out infinite',
        winnerGlow: 'winnerGlow 1.6s ease-in-out infinite',
        countPop: 'countPop 0.4s cubic-bezier(0.2,0.8,0.2,1) both',
      },
    },
  },
  plugins: [],
};
