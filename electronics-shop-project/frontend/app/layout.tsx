import type { Metadata } from "next";
import "./globals.css";
import { BRANDING } from "@/lib/branding";

export const metadata: Metadata = {
  title: `${BRANDING.siteName} — Điện thoại, Laptop, Tablet, PC Gaming`,
  description: BRANDING.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
