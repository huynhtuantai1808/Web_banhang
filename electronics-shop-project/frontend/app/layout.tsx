import type { Metadata } from "next";
import "./globals.css";
import { BRANDING } from "@/lib/branding";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";
import ChatWidget from "@/components/ChatWidget";

export const metadata: Metadata = {
  title: `${BRANDING.siteName} — Điện thoại, Laptop, Tablet, PC Gaming`,
  description: BRANDING.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <SiteSettingsProvider>
          {children}
          <ChatWidget />
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
