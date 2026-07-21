"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, LogOut } from "lucide-react";
import { isEmployeeLoggedIn } from "@/lib/auth-storage";
import { employeeLogout } from "@/lib/services/employees";

/**
 * Layout này CHỈ áp dụng cho các trang nằm trong app/admin/products/* (theo quy tắc
 * Next.js App Router: layout.tsx chỉ bọc các route con cùng thư mục).
 * Trang app/admin/login/page.tsx nằm NGOÀI thư mục này nên không bị áp layout/kiểm tra
 * đăng nhập ở đây — tách biệt hoàn toàn logic "đã đăng nhập" khỏi logic "đăng nhập".
 */
export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isEmployeeLoggedIn()) {
      router.replace("/admin/login");
      return;
    }
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

  return (
    <div className="min-h-screen bg-circuit-bg">
      <nav className="border-b border-circuit-line bg-circuit-panel px-8 py-3 flex items-center justify-between">
        <Link href="/admin/products" className="flex items-center gap-2 text-circuit-text font-display">
          <LayoutDashboard size={18} className="text-circuit-copperLight" />
          TechTrace Admin
        </Link>
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
