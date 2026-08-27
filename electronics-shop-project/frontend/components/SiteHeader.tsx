"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, UserPlus, LogOut, ShoppingCart, Package, Phone, Heart, Newspaper, Tag } from "lucide-react";
import { isCustomerLoggedIn } from "@/lib/auth-storage";
import { customerLogout } from "@/lib/services/auth";
import { getGuestCart, getGuestCartCount } from "@/lib/guestCart";
import { getCart } from "@/lib/services/cart";
import { getWishlistCount } from "@/lib/services/wishlist";
import { getGuestWishlistCount } from "@/lib/wishlist";
import Logo from "@/components/Logo";

function useCartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function loadCount() {
      if (isCustomerLoggedIn()) {
        try {
          const cart = await getCart();
          setCount(cart.items.reduce((sum, item) => sum + item.quantity, 0));
        } catch {
          setCount(0);
        }
      } else {
        setCount(getGuestCartCount());
      }
    }
    loadCount();
    window.addEventListener("cart-updated", loadCount);
    return () => window.removeEventListener("cart-updated", loadCount);
  }, []);

  return count;
}

function useWishlistCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function loadCount() {
      if (isCustomerLoggedIn()) {
        const c = await getWishlistCount().catch(() => 0);
        setCount(c);
      } else {
        setCount(getGuestWishlistCount());
      }
    }
    loadCount();
    window.addEventListener("wishlist-updated", loadCount);
    return () => window.removeEventListener("wishlist-updated", loadCount);
  }, []);

  return count;
}

export default function SiteHeader() {
  const [loggedIn, setLoggedIn] = useState(false);
  const cartCount = useCartCount();
  const wishlistCount = useWishlistCount();

  useEffect(() => {
    setLoggedIn(isCustomerLoggedIn());
  }, []);

  function handleLogout() {
    customerLogout();
    setLoggedIn(false);
    window.dispatchEvent(new Event("cart-updated"));
  }

  return (
    <header className="sticky top-0 z-50 glass-panel rounded-2xl px-6 py-4 mb-10 flex items-center justify-between mx-auto max-w-7xl mt-4">
      <Link href="/">
        <Logo />
      </Link>

      <nav className="flex items-center gap-3">
        <Link
          href="/news"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-circuit-muted hover:text-circuit-copperLight hover:bg-circuit-surface transition-all duration-300"
        >
          <Newspaper size={16} /> Tin tức
        </Link>
        <Link
          href="/promotions"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-circuit-muted hover:text-circuit-signal hover:bg-circuit-signal/10 transition-all duration-300"
        >
          <Tag size={16} /> Khuyến mãi
        </Link>
        <Link
          href="/contact"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-circuit-muted hover:text-circuit-copperLight hover:bg-circuit-surface transition-all duration-300"
          title="Liên hệ"
        >
          <Phone size={16} />
          <span className="hidden sm:inline">Liên hệ</span>
        </Link>

        <div className="w-px h-6 bg-circuit-line mx-1"></div>

        <Link
          href="/cart"
          className="relative flex items-center justify-center w-10 h-10 rounded-xl text-circuit-copperLight hover:bg-circuit-copper/10 transition-all duration-300 hover:scale-105 active:scale-95"
          title="Giỏ hàng"
        >
          <ShoppingCart size={20} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-circuit-signal text-circuit-bg text-[10px] font-bold flex items-center justify-center leading-none shadow-[0_0_10px_rgba(48,223,147,0.5)]">
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          )}
        </Link>

        <Link
          href="/wishlist"
          className="relative flex items-center justify-center w-10 h-10 rounded-xl text-circuit-muted hover:text-red-400 hover:bg-red-400/10 transition-all duration-300 hover:scale-105 active:scale-95"
          title="Yêu thích"
        >
          <Heart size={20} />
          {wishlistCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-[0_0_10px_rgba(239,68,68,0.5)]">
              {wishlistCount > 9 ? "9+" : wishlistCount}
            </span>
          )}
        </Link>

        {loggedIn ? (
          <>
            <Link
              href="/orders"
              className="flex items-center justify-center w-10 h-10 rounded-xl text-circuit-muted hover:text-circuit-copperLight hover:bg-circuit-copper/10 transition-all duration-300 hover:scale-105 active:scale-95"
              title="Đơn hàng"
            >
              <Package size={20} />
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-10 h-10 rounded-xl text-circuit-muted hover:text-red-400 hover:bg-red-400/10 transition-all duration-300 hover:scale-105 active:scale-95"
              title="Đăng xuất"
            >
              <LogOut size={20} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 ml-2">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-circuit-copper hover:text-circuit-copperLight transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-circuit-bg bg-gradient-to-r from-circuit-copper to-circuit-copperLight hover:shadow-glow hover:-translate-y-0.5 transition-all duration-300"
            >
              <UserPlus size={16} /> Đăng ký
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
