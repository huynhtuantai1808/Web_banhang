/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        circuit: {
          bg: "#ffffff",        // White background
          panel: "#f8f9fb",     // Slightly off-white panels
          surface: "#f0f2f5",   // Floating element surface
          line: "#e2e5ea",      // Light borders
          copper: "#c87f45",    // Premium gold/copper accent (kept)
          copperLight: "#b06e35",// Slightly darker for readability on white
          signal: "#16a34a",    // Green for positive signals (darker for contrast)
          signalMuted: "#bbf7d0",
          text: "#1a1a2e",      // Dark text
          muted: "#6b7280",     // Gray muted text
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
        "circuit-grid": "linear-gradient(#f0f2f5 1px, transparent 1px), linear-gradient(90deg, #f0f2f5 1px, transparent 1px)",
        "premium-gradient": "linear-gradient(135deg, rgba(200,127,69,0.08) 0%, rgba(255,255,255,0) 100%)",
        "glass-gradient": "linear-gradient(145deg, rgba(248,249,251,0.8) 0%, rgba(240,242,245,0.9) 100%)",
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
