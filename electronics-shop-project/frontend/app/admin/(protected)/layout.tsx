"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, LogOut, Users, Package } from "lucide-react";
import { isEmployeeLoggedIn } from "@/lib/auth-storage";
import { employeeLogout, isCurrentEmployeeAdmin } from "@/lib/services/employees";
import Logo from "@/components/Logo";

/**
 * Layout này áp dụng cho MỌI trang trong route group app/admin/(protected)/* — ví dụ
 * /admin/products và /admin/users — nhờ vào cú pháp "(protected)" của Next.js (route group,
 * không xuất hiện trên URL). Trang app/admin/login/page.tsx nằm NGOÀI group này nên hoàn
 * toàn tách biệt, không bị áp layout/kiểm tra đăng nhập ở đây.
 */
export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isEmployeeLoggedIn()) {
      router.replace("/admin/login");
      return;
    }
    setIsAdmin(isCurrentEmployeeAdmin());
    setChecked(true);
  }, [router]);

  function handleLogout() {
    employeeLogout();
    router.replace("/admin/login");
  }

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-circuit-bg text-circuit-muted">
        Đang kiểm tra đăng nhập...
      </div>
    );
  }

  const navItems = [
    { href: "/admin/products", label: "Sản phẩm", icon: Package, adminOnly: false },
    { href: "/admin/users", label: "Nhân viên", icon: Users, adminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-circuit-bg">
      <nav className="border-b border-circuit-line bg-circuit-panel px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin/products">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            {navItems
              .filter((item) => !item.adminOnly || isAdmin)
              .map((item) => {
                const Icon = item.icon;
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      active
                        ? "bg-circuit-copper/15 text-circuit-copperLight"
                        : "text-circuit-muted hover:text-circuit-text"
                    }`}
                  >
                    <Icon size={15} /> {item.label}
                  </Link>
                );
              })}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-circuit-muted hover:text-red-400 transition-colors"
        >
          <LogOut size={16} /> Đăng xuất
        </button>
      </nav>
      {children}
    </div>
  );
}
