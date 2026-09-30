import type { Metadata } from "next";
import "./globals.css";
import { BRANDING } from "@/lib/branding";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";
import ChatWidget from "@/components/ChatWidget";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: `${BRANDING.siteName} — Điện thoại, Laptop, Tablet, PC Gaming`,
  description: BRANDING.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SiteSettingsProvider>
            {children}
            <ChatWidget />
          </SiteSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
