"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-[68px] h-[34px] rounded-full bg-circuit-surface/50" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative inline-flex h-[34px] w-[68px] shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-circuit-copper focus-visible:ring-offset-2 overflow-hidden shadow-inner ${
        isDark ? "bg-slate-800" : "bg-sky-200"
      }`}
      role="switch"
      aria-checked={isDark}
    >
      {/* Background elements */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${isDark ? 'opacity-0' : 'opacity-100'}`}>
        <div className="absolute top-1 left-2 w-8 h-4 bg-white/40 rounded-full blur-[2px]" />
        <div className="absolute bottom-0 right-1 w-6 h-3 bg-white/60 rounded-full blur-[2px]" />
      </div>
      <div className={`absolute inset-0 transition-opacity duration-500 ${isDark ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute top-1 left-1 w-1 h-1 bg-white rounded-full shadow-[0_0_2px_#fff]" />
        <div className="absolute top-4 left-3 w-0.5 h-0.5 bg-white rounded-full shadow-[0_0_2px_#fff]" />
        <div className="absolute top-2 right-4 w-1 h-1 bg-white rounded-full shadow-[0_0_2px_#fff]" />
      </div>

      <span className="sr-only">Toggle theme</span>
      <span
        className={`pointer-events-none relative inline-block h-[26px] w-[26px] transform rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] ring-0 transition duration-500 ease-in-out ${
          isDark ? "translate-x-[16px]" : "translate-x-[-16px]"
        }`}
      >
        <span
          className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity duration-500 ease-in-out ${
            isDark ? "opacity-0" : "opacity-100"
          }`}
        >
          <Sun className="h-4 w-4 text-amber-500 drop-shadow-[0_0_2px_rgba(245,158,11,0.5)]" />
        </span>
        <span
          className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity duration-500 ease-in-out ${
            isDark ? "opacity-100" : "opacity-0"
          }`}
        >
          <Moon className="h-4 w-4 text-slate-700 drop-shadow-[0_0_2px_rgba(51,65,81,0.5)]" />
        </span>
      </span>
    </button>
  );
}
