"use client";

import { useEffect, useState } from "react";
import { listBrands, listCategories, CatalogOption, CategoryOption } from "@/lib/services/products";

/**
 * LƯU Ý SỬA LỖI: phiên bản trước dùng `motion.span layoutId` để tạo hiệu ứng "viên thuốc"
 * trượt giữa các nút khi đổi lựa chọn. Khi nút active đổi nhanh (unmount nút cũ / mount nút
 * mới cùng layoutId mà KHÔNG có <AnimatePresence> bao ngoài), Framer Motion tự thao tác DOM
 * trực tiếp (kỹ thuật FLIP) để tạo hiệu ứng layout — điều này có thể xung đột với việc React
 * reconciler cũng đang cố gắng gắn/gỡ đúng node đó, gây lỗi:
 *   "NotFoundError: Failed to execute 'insertBefore' on 'Node'..."
 * Cách sửa triệt để: bỏ layoutId/motion khỏi phần tô nền nút active, chỉ dùng class CSS
 * (transition-colors) — vẫn có hiệu ứng mượt nhưng không còn động vào DOM ngoài tầm kiểm soát
 * của React.
 */

export interface FilterState {
  category?: string;
  brand?: string;
  priceLabel?: string;
  feature?: string;
  sort_by?: string;
}

const SORT_OPTIONS = [
  { value: "new", label: "Mới nhất" },
  { value: "price_asc", label: "Giá thấp đến cao" },
  { value: "price_desc", label: "Giá cao xuống thấp" },
  { value: "name_asc", label: "Tên A-Z" },
  { value: "name_desc", label: "Tên Z-A" },
  { value: "discount_desc", label: "Giảm giá nhiều nhất" },
];

const PRICE_OPTIONS = [
  { label: "< 10tr", min: 0, max: 10_000_000 },
  { label: "10-20tr", min: 10_000_000, max: 20_000_000 },
  { label: "20-40tr", min: 20_000_000, max: 40_000_000 },
  { label: "> 40tr", min: 40_000_000, max: undefined },
];

const FEATURE_OPTIONS = ["Gaming", "Đồ hoạ", "Văn phòng", "Mỏng nhẹ"];

interface FilterTabsProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
}

/** Component được điều khiển hoàn toàn bởi component cha (controlled component).
 * Lấy danh sách hãng và danh mục từ API để hiển thị dropdown. */
export default function FilterTabs({ value, onChange }: FilterTabsProps) {
  const [brands, setBrands] = useState<CatalogOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([listBrands(), listCategories()])
      .then(([b, c]) => {
        setBrands(b);
        setCategories(c);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  function select(key: keyof FilterState, option: string) {
    const next = value[key] === option ? undefined : option;
    onChange({ ...value, [key]: next });
  }

  function selectCategory(name: string) {
    onChange({ ...value, category: value.category === name ? undefined : name });
    setShowCategoryDropdown(false);
  }

  function selectBrand(name: string) {
    onChange({ ...value, brand: value.brand === name ? undefined : name });
    setShowBrandDropdown(false);
  }

  // Build category tree for grouped display
  const topCategories = categories.filter((c) => !c.parent_id);
  const childMap = new Map<number, CategoryOption[]>();
  categories.forEach((c) => {
    if (c.parent_id) {
      if (!childMap.has(c.parent_id)) childMap.set(c.parent_id, []);
      childMap.get(c.parent_id)!.push(c);
    }
  });

  return (
    <div className="space-y-6 glass-panel p-5 rounded-2xl">
      {/* Sắp xếp */}
      <div>
        <p className="text-[11px] font-mono text-circuit-muted uppercase tracking-widest mb-2">Sắp xếp theo</p>
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowSortDropdown((v) => !v); setShowCategoryDropdown(false); setShowBrandDropdown(false); }}
            className={`w-full max-w-xs flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-sm text-left transition-all duration-300 ${
              value.sort_by
                ? "border-circuit-copper/50 bg-circuit-copper/10 text-circuit-copperLight shadow-glow"
                : "border-circuit-line/60 bg-circuit-panel text-circuit-muted hover:border-circuit-copper/40 hover:bg-circuit-panel/80"
            }`}
          >
            <span>{value.sort_by ? SORT_OPTIONS.find((o) => o.value === value.sort_by)?.label : "Mặc định (Mới nhất)"}</span>
            <ChevronDown size={14} />
          </button>

          {showSortDropdown && (
            <div className="absolute z-30 mt-2 w-full max-w-xs overflow-hidden rounded-xl border border-circuit-line/60 bg-circuit-panel/95 backdrop-blur-xl shadow-glass">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    select("sort_by", opt.value);
                    setShowSortDropdown(false);
                  }}
                  className={`w-full flex items-center px-4 py-2.5 text-sm text-left transition-colors ${
                    value.sort_by === opt.value
                      ? "text-circuit-copperLight bg-circuit-copper/10"
                      : "text-circuit-muted hover:bg-circuit-surface/80 hover:text-circuit-text"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Danh mục — dropdown 2 cấp */}
      <div>
        <p className="text-xs font-mono text-circuit-muted uppercase tracking-wide mb-2">Danh mục</p>
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowCategoryDropdown((v) => !v); setShowBrandDropdown(false); setShowSortDropdown(false); }}
            className={`w-full max-w-xs flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-sm text-left transition-all duration-300 ${
              value.category
                ? "border-circuit-copper/50 bg-circuit-copper/10 text-circuit-copperLight shadow-glow"
                : "border-circuit-line/60 bg-circuit-panel text-circuit-muted hover:border-circuit-copper/40 hover:bg-circuit-panel/80"
            }`}
          >
            <span>{value.category || "— Chọn danh mục —"}</span>
            <ChevronDown size={14} />
          </button>

          {showCategoryDropdown && (
            <div className="absolute z-20 mt-2 w-80 max-h-80 overflow-y-auto rounded-xl border border-circuit-line/60 bg-circuit-panel/95 backdrop-blur-xl shadow-glass">
              {topCategories.length === 0 ? (
                <p className="px-4 py-3 text-xs text-circuit-muted">Chưa có danh mục nào.</p>
              ) : (
                topCategories.map((parent) => {
                  const children = childMap.get(parent.id) ?? [];
                  return (
                    <div key={parent.id}>
                      {/* Parent row */}
                      <button
                        type="button"
                        onClick={() => selectCategory(parent.name)}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left hover:bg-circuit-panel/80 transition-colors ${
                          value.category === parent.name ? "text-circuit-copperLight bg-circuit-copper/10" : "text-circuit-text"
                        }`}
                      >
                        <span className="font-medium">{parent.name}</span>
                        {children.length > 0 && (
                          <span className="text-xs text-circuit-muted">{children.length} ▼</span>
                        )}
                      </button>
                      {/* Children rows */}
                      {children.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => selectCategory(child.name)}
                          className={`w-full flex items-center gap-2 px-6 py-1.5 text-sm text-left hover:bg-circuit-panel/80 transition-colors ${
                            value.category === child.name ? "text-circuit-copperLight bg-circuit-copper/10" : "text-circuit-muted"
                          }`}
                        >
                          <span className="text-xs">└</span>
                          <span>{child.name}</span>
                        </button>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        {/* Active pills */}
        {value.category && (
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={() => selectCategory(value.category!)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border border-circuit-copper bg-circuit-copper/10 text-circuit-copperLight hover:bg-circuit-copper/20 transition-colors"
            >
              {value.category} <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Hãng — dropdown */}
      <div>
        <p className="text-xs font-mono text-circuit-muted uppercase tracking-wide mb-2">Hãng</p>
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowBrandDropdown((v) => !v); setShowCategoryDropdown(false); setShowSortDropdown(false); }}
            className={`w-full max-w-xs flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-sm text-left transition-all duration-300 ${
              value.brand
                ? "border-circuit-copper/50 bg-circuit-copper/10 text-circuit-copperLight shadow-glow"
                : "border-circuit-line/60 bg-circuit-panel text-circuit-muted hover:border-circuit-copper/40 hover:bg-circuit-panel/80"
            }`}
          >
            <span>{value.brand || "— Chọn hãng —"}</span>
            <ChevronDown size={14} />
          </button>

          {showBrandDropdown && (
            <div className="absolute z-20 mt-2 w-56 max-h-72 overflow-y-auto rounded-xl border border-circuit-line/60 bg-circuit-panel/95 backdrop-blur-xl shadow-glass">
              {brands.length === 0 ? (
                <p className="px-4 py-3 text-xs text-circuit-muted">Chưa có hãng nào.</p>
              ) : (
                brands.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => selectBrand(b.name)}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-circuit-panel/80 transition-colors ${
                      value.brand === b.name ? "text-circuit-copperLight bg-circuit-copper/10" : "text-circuit-text"
                    }`}
                  >
                    {value.brand === b.name && <span className="w-1.5 h-1.5 rounded-full bg-circuit-copper inline-block" />}
                    <span className={value.brand === b.name ? "" : "pl-5"}>{b.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {value.brand && (
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={() => selectBrand(value.brand!)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border border-circuit-copper bg-circuit-copper/10 text-circuit-copperLight hover:bg-circuit-copper/20 transition-colors"
            >
              {value.brand} <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Khoảng giá */}
      <div>
        <p className="text-xs font-mono text-circuit-muted uppercase tracking-wide mb-2">Khoảng giá</p>
        <div className="flex flex-wrap gap-2">
          {PRICE_OPTIONS.map((opt) => {
            const isActive = value.priceLabel === opt.label;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => select("priceLabel", opt.label)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  isActive
                    ? "border-circuit-copper bg-circuit-copperLight text-circuit-bg"
                    : "border-circuit-line text-circuit-muted hover:border-circuit-copper hover:text-circuit-copperLight"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chức năng */}
      <div>
        <p className="text-xs font-mono text-circuit-muted uppercase tracking-wide mb-2">Chức năng</p>
        <div className="flex flex-wrap gap-2">
          {FEATURE_OPTIONS.map((opt) => {
            const isActive = value.feature === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => select("feature", opt)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  isActive
                    ? "border-circuit-copper bg-circuit-copperLight text-circuit-bg"
                    : "border-circuit-line text-circuit-muted hover:border-circuit-copper hover:text-circuit-copperLight"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Close dropdowns when clicking outside */}
      {showCategoryDropdown || showBrandDropdown || showSortDropdown ? (
        <div
          className="fixed inset-0 z-10"
          onClick={() => { setShowCategoryDropdown(false); setShowBrandDropdown(false); setShowSortDropdown(false); }}
        />
      ) : null}
    </div>
  );
}

function ChevronDown({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
