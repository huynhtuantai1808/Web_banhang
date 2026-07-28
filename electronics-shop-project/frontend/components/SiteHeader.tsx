"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, UserPlus, LogOut, ShoppingCart, Package, Phone } from "lucide-react";
import { isCustomerLoggedIn } from "@/lib/auth-storage";
import { customerLogout } from "@/lib/services/auth";
import Logo from "@/components/Logo";

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
      <Link href="/">
        <Logo />
      </Link>

      <nav className="flex items-center gap-3">
        <Link
          href="/contact"
          className="p-2 rounded-md border border-circuit-line hover:border-circuit-copper text-circuit-muted hover:text-circuit-copperLight transition-colors"
          title="Liên hệ"
        >
          <Phone size={18} />
        </Link>
        <Link
          href="/cart"
          className="p-2 rounded-md border border-circuit-line hover:border-circuit-copper text-circuit-muted hover:text-circuit-copperLight transition-colors"
          title="Giỏ hàng"
        >
          <ShoppingCart size={18} />
        </Link>
        {loggedIn ? (
          <>
            <Link
              href="/orders"
              className="flex items-center gap-2 rounded-md border border-circuit-line px-4 py-2 text-sm text-circuit-text hover:border-circuit-copper hover:text-circuit-copperLight transition-colors"
            >
              <Package size={16} /> Đơn hàng
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-md border border-circuit-line px-4 py-2 text-sm text-circuit-muted hover:border-red-400/60 hover:text-red-400 transition-colors"
            >
              <LogOut size={16} /> Đăng xuất
            </button>
          </>
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
              style={{ backgroundColor: "var(--accent-color)" }}
              className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-circuit-bg hover:opacity-90 transition-opacity"
            >
              <UserPlus size={16} /> Đăng ký
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
