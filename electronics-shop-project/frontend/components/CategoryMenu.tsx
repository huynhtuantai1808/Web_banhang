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
  const seenNames = new Set<string>();

  for (const node of nodes.values()) {
    if (node.parent_id && nodes.has(node.parent_id)) {
      nodes.get(node.parent_id)!.children.push(node);
    } else {
      const lowerName = node.name.toLowerCase().trim();
      if (!seenNames.has(lowerName)) {
        seenNames.add(lowerName);
        roots.push(node);
      }
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
        <div className="absolute left-0 top-full mt-2 z-40 w-[280px] sm:w-[850px] rounded-lg border border-circuit-line bg-circuit-panel shadow-2xl flex overflow-hidden">
          {/* Cột danh mục cha */}
          <div className="w-full sm:w-[260px] border-r border-circuit-line py-2 flex-shrink-0 bg-circuit-panel/50">
            {categories.length === 0 && (
              <p className="px-4 py-3 text-sm text-circuit-muted">Chưa có danh mục nào.</p>
            )}
            {categories.map((cat) => {
              const Icon = iconFor(cat.name);
              const hasChildren = cat.children.length > 0;
              const isActive = activeParent === cat.id;
              return (
                <div
                  key={cat.id}
                  onMouseEnter={() => setActiveParent(cat.id)}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer text-sm border-l-4 transition-colors ${
                    isActive 
                      ? "border-red-500 bg-red-500/10 text-red-500" 
                      : "border-transparent text-circuit-text hover:bg-circuit-bg/40 hover:text-red-400"
                  }`}
                >
                  <Link
                    href={`/category/${cat.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 flex-1 text-left font-medium"
                  >
                    <Icon size={18} className={isActive ? "text-red-500" : "text-circuit-muted"} /> 
                    {cat.name}
                  </Link>
                  {hasChildren && <ChevronRight size={14} className={isActive ? "text-red-500" : "text-circuit-muted"} />}
                </div>
              );
            })}
          </div>

          {/* Cột Mega Menu — hiện khi hover vào 1 danh mục cha */}
          <div className="hidden sm:block flex-1 p-6 bg-circuit-bg/20 min-h-[400px]">
            {(() => {
              const parent = categories.find((c) => c.id === activeParent);
              if (!parent) {
                return (
                  <div className="h-full flex items-center justify-center text-circuit-muted text-sm">
                    Di chuột vào danh mục bên trái để xem chi tiết.
                  </div>
                );
              }
              return (
                <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                  {/* Header Mega Panel */}
                  <div className="flex items-center justify-between mb-6 pb-2 border-b border-circuit-line/50">
                    <h2 className="text-xl font-bold text-circuit-text">{parent.name}</h2>
                    <Link
                      href={`/category/${parent.slug}`}
                      onClick={() => setOpen(false)}
                      className="text-sm font-medium text-red-500 hover:text-red-400 transition-colors flex items-center gap-1"
                    >
                      Xem tất cả <ChevronRight size={14} />
                    </Link>
                  </div>

                  {/* Columns */}
                  <div className="grid grid-cols-3 gap-8">
                    {/* Cột 1: Giá bán */}
                    <div>
                      <h3 className="font-semibold text-circuit-copperLight mb-4 text-sm uppercase tracking-wider">Giá bán</h3>
                      <ul className="space-y-3">
                        <li>
                          <Link href={`/category/${parent.slug}?priceLabel=< 10tr`} onClick={() => setOpen(false)} className="text-sm text-circuit-text hover:text-red-400 transition-colors">
                            Dưới 10 triệu
                          </Link>
                        </li>
                        <li>
                          <Link href={`/category/${parent.slug}?priceLabel=10-20tr`} onClick={() => setOpen(false)} className="text-sm text-circuit-text hover:text-red-400 transition-colors">
                            Từ 10 đến 20 triệu
                          </Link>
                        </li>
                        <li>
                          <Link href={`/category/${parent.slug}?priceLabel=20-40tr`} onClick={() => setOpen(false)} className="text-sm text-circuit-text hover:text-red-400 transition-colors">
                            Từ 20 đến 40 triệu
                          </Link>
                        </li>
                        <li>
                          <Link href={`/category/${parent.slug}?priceLabel=> 40tr`} onClick={() => setOpen(false)} className="text-sm text-circuit-text hover:text-red-400 transition-colors">
                            Trên 40 triệu
                          </Link>
                        </li>
                      </ul>
                    </div>

                    {/* Cột 2: Danh mục con */}
                    {parent.children.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-circuit-copperLight mb-4 text-sm uppercase tracking-wider">Danh mục con</h3>
                        <ul className="space-y-3">
                          {parent.children.map((child) => (
                            <li key={child.id}>
                              <Link
                                href={`/category/${child.slug}`}
                                onClick={() => setOpen(false)}
                                className="text-sm text-circuit-text hover:text-red-400 transition-colors"
                              >
                                {child.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Cột 3: Thương hiệu (Tĩnh) */}
                    <div>
                      <h3 className="font-semibold text-circuit-copperLight mb-4 text-sm uppercase tracking-wider">Thương hiệu nổi bật</h3>
                      <ul className="space-y-3">
                        {["ACER", "ASUS", "DELL", "LENOVO", "MSI", "APPLE"].map((brand) => (
                          <li key={brand}>
                            <Link 
                              href={`/category/${parent.slug}?brand=${brand}`} 
                              onClick={() => setOpen(false)} 
                              className="text-sm text-circuit-text hover:text-red-400 transition-colors"
                            >
                              {brand}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
