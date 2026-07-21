"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import clsx from "clsx";

const FILTER_GROUPS = [
  { key: "category", label: "Loại sản phẩm", options: ["Điện thoại", "Laptop", "Máy tính bảng", "PC Gaming"] },
  { key: "brand", label: "Hãng", options: ["Apple", "Samsung", "Dell", "Asus", "MSI"] },
  { key: "price", label: "Khoảng giá", options: ["< 10tr", "10-20tr", "20-40tr", "> 40tr"] },
  { key: "feature", label: "Chức năng", options: ["Gaming", "Đồ hoạ", "Văn phòng", "Mỏng nhẹ"] },
];

export default function FilterTabs({
  onChange,
}: {
  onChange?: (group: string, value: string) => void;
}) {
  const [active, setActive] = useState<Record<string, string | null>>({});

  const select = (group: string, value: string) => {
    const next = active[group] === value ? null : value;
    setActive((prev) => ({ ...prev, [group]: next }));
    onChange?.(group, next ?? "");
  };

  return (
    <div className="space-y-4">
      {FILTER_GROUPS.map((group) => (
        <div key={group.key}>
          <p className="text-xs font-mono text-circuit-muted uppercase tracking-wide mb-2">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.options.map((opt) => {
              const isActive = active[group.key] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => select(group.key, opt)}
                  className={clsx(
                    "relative px-3 py-1.5 rounded-full text-sm border transition-colors",
                    isActive
                      ? "border-circuit-copper text-circuit-bg bg-circuit-copperLight"
                      : "border-circuit-line text-circuit-muted hover:border-circuit-copper hover:text-circuit-copperLight"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId={`pill-${group.key}`}
                      className="absolute inset-0 rounded-full bg-circuit-copperLight -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
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
