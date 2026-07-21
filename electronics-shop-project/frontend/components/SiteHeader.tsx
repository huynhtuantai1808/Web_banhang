"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, UserPlus, LogOut, Cpu } from "lucide-react";
import { isCustomerLoggedIn } from "@/lib/auth-storage";
import { customerLogout } from "@/lib/services/auth";

export default function SiteHeader() {
  const [loggedIn, setLoggedIn] = useState(false);

  // Đọc trạng thái đăng nhập ở client sau khi mount để tránh lệch hydration (SSR không có localStorage)
  useEffect(() => {
    setLoggedIn(isCustomerLoggedIn());
  }, []);

  function handleLogout() {
    customerLogout();
    setLoggedIn(false);
  }

  return (
    <header className="flex items-center justify-between mb-6">
      <Link href="/" className="flex items-center gap-2 font-display text-lg text-circuit-text">
        <Cpu size={20} className="text-circuit-copperLight" />
        TechTrace
      </Link>

      <nav className="flex items-center gap-3">
        {loggedIn ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-md border border-circuit-line px-4 py-2 text-sm text-circuit-muted hover:border-red-400/60 hover:text-red-400 transition-colors"
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        ) : (
          <>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-md border border-circuit-line px-4 py-2 text-sm text-circuit-text hover:border-circuit-copper hover:text-circuit-copperLight transition-colors"
            >
              <LogIn size={16} /> Đăng nhập
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-md bg-circuit-copper px-4 py-2 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors"
            >
              <UserPlus size={16} /> Đăng ký
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
