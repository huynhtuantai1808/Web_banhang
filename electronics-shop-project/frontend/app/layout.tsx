import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TechTrace — Điện thoại, Laptop, Tablet, PC Gaming",
  description: "Cửa hàng đồ điện tử chính hãng — trả góp linh hoạt, giao nhanh toàn quốc.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
