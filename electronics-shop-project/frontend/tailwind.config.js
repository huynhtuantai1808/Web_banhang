/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Bật chế độ dark mode qua class="dark"
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        circuit: {
          bg: "var(--circuit-bg)",
          panel: "var(--circuit-panel)",
          surface: "var(--circuit-surface)",
          line: "var(--circuit-line)",
          copper: "var(--circuit-copper)",
          copperLight: "var(--circuit-copperLight)",
          signal: "var(--circuit-signal)",
          signalMuted: "var(--circuit-signalMuted)",
          text: "var(--circuit-text)",
          muted: "var(--circuit-muted)",
        },
        brand: {
          primary: "var(--accent-color)",
          secondary: "var(--accent-color-light)",
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "circuit-grid": "linear-gradient(var(--circuit-surface) 1px, transparent 1px), linear-gradient(90deg, var(--circuit-surface) 1px, transparent 1px)",
        "premium-gradient": "linear-gradient(135deg, rgba(200,127,69,0.08) 0%, rgba(255,255,255,0) 100%)",
        "glass-gradient": "linear-gradient(145deg, var(--circuit-glass) 0%, var(--circuit-glass-dark) 100%)",
      },
      backgroundSize: {
        "circuit-grid": "32px 32px",
      },
      boxShadow: {
        'glow': '0 0 20px rgba(200, 127, 69, 0.12)',
        'glow-strong': '0 0 30px rgba(200, 127, 69, 0.2)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
};
