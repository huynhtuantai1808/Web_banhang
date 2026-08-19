"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, UserPlus, LogOut, ShoppingCart, Package, Phone } from "lucide-react";
import { isCustomerLoggedIn } from "@/lib/auth-storage";
import { customerLogout } from "@/lib/services/auth";
import { getGuestCart } from "@/lib/guestCart";
import Logo from "@/components/Logo";

function useCartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function loadCount() {
      if (isCustomerLoggedIn()) {
        // Logged-in: count from localStorage cart (simplified — real impl would call API)
        const raw = localStorage.getItem("cart_count");
        setCount(raw ? parseInt(raw, 10) : 0);
      } else {
        const guest = getGuestCart();
        setCount(guest.reduce((sum, item) => sum + item.quantity, 0));
      }
    }
    loadCount();
    window.addEventListener("cart-updated", loadCount);
    return () => window.removeEventListener("cart-updated", loadCount);
  }, []);

  return count;
}

export default function SiteHeader() {
  const [loggedIn, setLoggedIn] = useState(false);
  const cartCount = useCartCount();

  useEffect(() => {
    setLoggedIn(isCustomerLoggedIn());
  }, []);

  function handleLogout() {
    customerLogout();
    setLoggedIn(false);
    window.dispatchEvent(new Event("cart-updated"));
  }

  return (
    <header className="flex items-center justify-between mb-6">
      <Link href="/">
        <Logo />
      </Link>

      <nav className="flex items-center gap-3">
        <Link
          href="/contact"
          className="relative flex items-center gap-2 px-4 py-2 rounded-md border border-circuit-copper text-circuit-copperLight hover:bg-circuit-copper hover:text-circuit-bg transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-circuit-copper/20 hover:scale-105 active:scale-95"
          title="Liên hệ"
        >
          <Phone size={18} />
          <span className="hidden sm:inline text-sm font-medium">Liên hệ</span>
        </Link>

        <Link
          href="/cart"
          className="relative flex items-center gap-2 px-4 py-2 rounded-md border border-circuit-copper text-circuit-copperLight hover:bg-circuit-copper hover:text-circuit-bg transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-circuit-copper/20 hover:scale-105 active:scale-95"
          title="Giỏ hàng"
        >
          <ShoppingCart size={18} />
          <span className="hidden sm:inline text-sm font-medium">Giỏ hàng</span>
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-md">
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          )}
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
              className="relative flex items-center gap-2 rounded-md border-2 border-circuit-copper px-4 py-2 text-sm font-semibold text-circuit-copperLight hover:bg-circuit-copper hover:text-circuit-bg transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-circuit-copper/30 hover:scale-105 active:scale-95"
            >
              <LogIn size={16} /> Đăng nhập
            </Link>
            <Link
              href="/register"
              style={{ backgroundColor: "var(--accent-color)" }}
              className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-circuit-bg hover:opacity-90 transition-opacity shadow-md"
            >
              <UserPlus size={16} /> Đăng ký
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
