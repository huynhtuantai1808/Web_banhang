"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronRight, Smartphone, Laptop, Tablet, Monitor, Camera, Cpu } from "lucide-react";
import { listCategories, CategoryOption } from "@/lib/services/products";

// Icon gợi ý theo tên danh mục phổ biến — chỉ để trang trí, không ảnh hưởng dữ liệu.
const ICON_MAP: Record<string, any> = {
  "điện thoại": Smartphone,
  "laptop": Laptop,
  "máy tính bảng": Tablet,
  "pc gaming": Monitor,
  "camera": Camera,
};

function iconFor(name: string) {
  const key = name.toLowerCase().trim();
  return ICON_MAP[key] || Cpu;
}

interface CategoryNode extends CategoryOption {
  children: CategoryNode[];
}

function buildTree(flat: CategoryOption[]): CategoryNode[] {
  const nodes = new Map<number, CategoryNode>(flat.map((c) => [c.id, { ...c, children: [] }]));
  const roots: CategoryNode[] = [];

  for (const node of nodes.values()) {
    if (node.parent_id && nodes.has(node.parent_id)) {
      nodes.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/** Menu danh mục dạng hamburger (☰) — mở ra danh sách danh mục cha, hover/click vào 1 danh mục
 * cha sẽ hiện thêm danh mục con (">"). Tách biệt hoàn toàn với <FilterTabs> ở sidebar — đây là
 * điều hướng theo cây danh mục (điều hướng sang trang riêng), còn FilterTabs là lọc tại chỗ trên
 * cùng 1 trang danh sách sản phẩm. */
export default function CategoryMenu() {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [activeParent, setActiveParent] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listCategories().then((flat) => setCategories(buildTree(flat))).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-circuit-line px-3 py-2 text-sm text-circuit-text hover:border-circuit-copper transition-colors"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
        Danh mục
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-40 w-[280px] sm:w-[520px] rounded-lg border border-circuit-line bg-circuit-panel shadow-2xl flex overflow-hidden">
          {/* Cột danh mục cha */}
          <div className="w-full sm:w-1/2 border-r border-circuit-line py-2">
            {categories.length === 0 && (
              <p className="px-4 py-3 text-sm text-circuit-muted">Chưa có danh mục nào.</p>
            )}
            {categories.map((cat) => {
              const Icon = iconFor(cat.name);
              const hasChildren = cat.children.length > 0;
              return (
                <div
                  key={cat.id}
                  onMouseEnter={() => setActiveParent(cat.id)}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer text-sm ${
                    activeParent === cat.id ? "bg-circuit-bg/60 text-circuit-copperLight" : "text-circuit-text hover:bg-circuit-bg/40"
                  }`}
                >
                  <Link
                    href={`/category/${cat.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <Icon size={16} /> {cat.name}
                  </Link>
                  {hasChildren && <ChevronRight size={14} className="text-circuit-muted" />}
                </div>
              );
            })}
          </div>

          {/* Cột danh mục con — hiện khi hover vào 1 danh mục cha có con */}
          <div className="hidden sm:block w-1/2 py-2">
            {(() => {
              const parent = categories.find((c) => c.id === activeParent);
              if (!parent || parent.children.length === 0) {
                return (
                  <p className="px-4 py-3 text-sm text-circuit-muted">
                    {parent ? "Không có danh mục con." : "Di chuột vào 1 danh mục để xem thêm."}
                  </p>
                );
              }
              return parent.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/category/${child.slug}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-sm text-circuit-muted hover:text-circuit-copperLight hover:bg-circuit-bg/40"
                >
                  {parent.name} <ChevronRight size={12} className="inline mx-1" /> {child.name}
                </Link>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
