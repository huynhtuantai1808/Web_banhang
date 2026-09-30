"use client";
import { ThemeProvider } from "next-themes";

export default function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="admin-theme"
    >
      {children}
    </ThemeProvider>
  );
}
