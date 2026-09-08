"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, LogOut, Users, Package, Palette, Tag, UserCircle, ClipboardList, LayoutGrid, CalendarClock, FileText, PackageSearch, BarChart3, Settings, Megaphone, Newspaper, MessageCircle } from "lucide-react";
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
    const userIsAdmin = isCurrentEmployeeAdmin();
    setIsAdmin(userIsAdmin);
    setChecked(true);
    
    if (!userIsAdmin && (pathname.startsWith("/admin/settings") || pathname.startsWith("/admin/employees") || pathname.startsWith("/admin/users"))) {
      router.replace("/admin/dashboard");
    }
  }, [router, pathname]);

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
    { href: "/admin/orders", label: "Đơn hàng", icon: ClipboardList, adminOnly: false },
    { href: "/admin/invoices", label: "Hóa đơn", icon: FileText, adminOnly: false },
    { href: "/admin/chat", label: "Chat Hỗ Trợ", icon: MessageCircle, adminOnly: false },
    { href: "/admin/products", label: "Sản phẩm", icon: Package, adminOnly: false },
    { href: "/admin/inventory", label: "Tồn kho", icon: PackageSearch, adminOnly: true },
    { href: "/admin/categories", label: "Phân loại", icon: LayoutGrid, adminOnly: false },
    { href: "/admin/promotions", label: "Khuyến mãi", icon: Tag, adminOnly: true },
    { href: "/admin/banners", label: "Quảng cáo", icon: Megaphone, adminOnly: true },
    { href: "/admin/posts", label: "Bài viết", icon: Newspaper, adminOnly: true },
    { href: "/admin/installments", label: "Trả góp", icon: CalendarClock, adminOnly: false },
    { href: "/admin/customers", label: "Khách hàng", icon: UserCircle, adminOnly: true },
    { href: "/admin/users", label: "Nhân viên", icon: Users, adminOnly: true },
    { href: "/admin/reports", label: "Báo cáo", icon: BarChart3, adminOnly: true },
    { href: "/admin/settings", label: "Cài đặt", icon: Settings, adminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-circuit-bg flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-circuit-line bg-circuit-panel flex flex-col flex-shrink-0 z-20">
        <div className="h-16 flex items-center px-6 border-b border-circuit-line/60">
          <Link href="/admin/products">
            <Logo />
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 custom-scrollbar">
          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const Icon = item.icon;
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-circuit-copper/15 text-circuit-copperLight font-medium"
                      : "text-circuit-muted hover:text-circuit-text hover:bg-circuit-line/20"
                  }`}
                >
                  <Icon size={18} /> {item.label}
                </Link>
              );
            })}
        </div>

        <div className="p-4 border-t border-circuit-line/60">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-circuit-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
