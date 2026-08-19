"use client";

import clsx from "clsx";

/**
 * LƯU Ý SỬA LỖI: phiên bản trước dùng `motion.span layoutId` để tạo hiệu ứng "viên thuốc"
 * trượt giữa các nút khi đổi lựa chọn. Khi nút active đổi nhanh (unmount nút cũ / mount nút
 * mới cùng layoutId mà KHÔNG có <AnimatePresence> bao ngoài), Framer Motion tự thao tác DOM
 * trực tiếp (kỹ thuật FLIP) để tạo hiệu ứng layout — điều này có thể xung đột với việc React
 * reconciler cũng đang cố gắn/gỡ đúng node đó, gây lỗi:
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
}

const FILTER_GROUPS: { key: keyof FilterState; label: string; options: string[] }[] = [
  { key: "category", label: "Loại sản phẩm", options: ["Điện thoại", "Laptop", "Máy tính bảng", "PC Gaming"] },
  { key: "brand", label: "Hãng", options: ["Apple", "Samsung", "Dell", "Asus", "MSI"] },
  { key: "priceLabel", label: "Khoảng giá", options: ["< 10tr", "10-20tr", "20-40tr", "> 40tr"] },
  { key: "feature", label: "Chức năng", options: ["Gaming", "Đồ hoạ", "Văn phòng", "Mỏng nhẹ"] },
];

/** Component được điều khiển hoàn toàn bởi component cha (controlled component):
 * cha giữ state `value`, truyền xuống để hiển thị đúng lựa chọn hiện tại và nhận lại
 * qua `onChange` mỗi khi người dùng bấm chọn/bỏ chọn một pill. */
export default function FilterTabs({
  value,
  onChange,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
}) {
  function select(key: keyof FilterState, option: string) {
    const next = value[key] === option ? undefined : option; // bấm lại để bỏ chọn
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="space-y-4">
      {FILTER_GROUPS.map((group) => (
        <div key={group.key}>
          <p className="text-xs font-mono text-circuit-muted uppercase tracking-wide mb-2">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.options.map((opt) => {
              const isActive = value[group.key] === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => select(group.key, opt)}
                  className={clsx(
                    "px-3 py-1.5 rounded-full text-sm border transition-colors duration-150",
                    isActive
                      ? "border-circuit-copper bg-circuit-copperLight text-circuit-bg"
                      : "border-circuit-line text-circuit-muted hover:border-circuit-copper hover:text-circuit-copperLight"
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
