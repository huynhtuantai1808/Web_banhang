/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Bảng màu lấy cảm hứng từ bo mạch điện tử (PCB) — không dùng cream/terracotta mặc định
        circuit: {
          bg: "#0B1220",      // nền navy đậm như bo mạch
          panel: "#121B2E",   // panel/card
          line: "#1E2C47",    // đường viền / trace mờ
          copper: "#C87F45",  // accent màu đồng (trace PCB thật)
          copperLight: "#E3A66E",
          signal: "#4ADE9C",  // đèn LED tín hiệu (xanh lá) - dùng cho trạng thái/giá tốt
          text: "#E7ECF5",
          muted: "#8A93A6",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "circuit-grid":
          "linear-gradient(#1E2C47 1px, transparent 1px), linear-gradient(90deg, #1E2C47 1px, transparent 1px)",
      },
      backgroundSize: {
        "circuit-grid": "28px 28px",
      },
    },
  },
  plugins: [],
};
