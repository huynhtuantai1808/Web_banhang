"use client";

import { Search, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { listProducts, ProductOut } from "@/lib/services/products";
import { getMediaUrl } from "@/lib/media";

export default function SearchBar({ onSearch }: { onSearch?: (keyword: string) => void }) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<ProductOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await listProducts({ keyword: value, page_size: 5 });
        setSuggestions(data.items);
        if (data.items.length > 0) {
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Lỗi khi fetch gợi ý tìm kiếm:", error);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [value]);

  const handleSelect = (product: ProductOut) => {
    setIsOpen(false);
    setValue("");
    router.push(`/products/${product.id}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    onSearch?.(value);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 rounded-2xl border border-circuit-line/60 bg-circuit-panel/60 backdrop-blur-md px-5 py-3 focus-within:border-circuit-copper focus-within:shadow-[0_0_15px_rgba(200,127,69,0.2)] transition-all duration-300 group"
      >
        {loading ? (
          <Loader2 size={20} className="text-circuit-copperLight animate-spin" />
        ) : (
          <Search size={20} className="text-circuit-muted group-focus-within:text-circuit-copperLight transition-colors" />
        )}
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder="Tìm điện thoại, laptop, tablet, PC gaming..."
          className="flex-1 bg-transparent outline-none text-sm text-circuit-text placeholder:text-circuit-muted"
        />
      </form>

      {/* Dropdown Suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-circuit-panel border border-circuit-line/60 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <ul className="py-2">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(p)}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-4 hover:bg-circuit-copper/10 transition-colors"
                >
                  <img
                    src={getMediaUrl(p.primary_image_url) || "/placeholder-product.svg"}
                    alt={p.name}
                    className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-circuit-text truncate">{p.name}</p>
                    <p className="text-xs text-circuit-muted mt-0.5">
                      {p.price.toLocaleString("vi-VN")}₫
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
