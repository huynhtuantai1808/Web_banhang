/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        circuit: {
          bg: "#080c14",      // Deepest midnight blue
          panel: "#0f1624",   // Slightly elevated dark
          surface: "#182236", // Floating element surface
          line: "#202d45",    // Borders
          copper: "#d48b50",  // Premium gold/copper
          copperLight: "#eab88e",
          signal: "#30df93",  // Neon green for positive signals
          signalMuted: "#1a754f",
          text: "#f0f4f8",
          muted: "#9ba8ba",
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
        "circuit-grid": "linear-gradient(#202d45 1px, transparent 1px), linear-gradient(90deg, #202d45 1px, transparent 1px)",
        "premium-gradient": "linear-gradient(135deg, rgba(200,127,69,0.1) 0%, rgba(11,18,32,0) 100%)",
        "glass-gradient": "linear-gradient(145deg, rgba(24, 34, 54, 0.4) 0%, rgba(15, 22, 36, 0.6) 100%)",
      },
      backgroundSize: {
        "circuit-grid": "32px 32px",
      },
      boxShadow: {
        'glow': '0 0 20px rgba(200, 127, 69, 0.15)',
        'glow-strong': '0 0 30px rgba(200, 127, 69, 0.3)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
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
