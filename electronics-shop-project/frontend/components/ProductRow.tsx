"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard, { Product } from "@/components/ProductCard";

export default function ProductRow({
  title,
  products,
  viewAllHref,
  onAddToCart,
}: {
  title: string;
  products: Product[];
  viewAllHref?: string;
  onAddToCart?: (productId: string) => Promise<void> | void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const hasMany = products.length > 4;

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    el?.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el?.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [products.length]);

  // Auto-scroll every 5s when there are many products
  useEffect(() => {
    if (!hasMany) return;
    const interval = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const firstCard = el.querySelector<HTMLElement>("[data-product-card]");
        const cardWidth = firstCard?.offsetWidth ?? 240;
        el.scrollBy({ left: cardWidth + 20, behavior: "smooth" });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [hasMany]);

  function scrollBy(dir: number) {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.querySelector<HTMLElement>("[data-product-card]");
    const cardWidth = firstCard?.offsetWidth ?? 240;
    el.scrollBy({ left: dir * (cardWidth + 20), behavior: "smooth" });
  }

  if (products.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl text-circuit-text">{title}</h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-sm text-circuit-muted hover:text-circuit-copperLight transition-colors"
          >
            Xem tất cả <ChevronRight size={14} />
          </Link>
        )}
      </div>

      <div className="relative">
        {/* Left arrow */}
        {hasMany && (
          <button
            onClick={() => scrollBy(-1)}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 ${
              canScrollLeft
                ? "bg-circuit-panel/95 border border-circuit-line text-circuit-copperLight hover:bg-circuit-copper hover:text-circuit-bg cursor-pointer"
                : "bg-circuit-panel/40 border border-circuit-line/40 text-circuit-muted/30 cursor-not-allowed"
            }`}
            aria-label="Cuộn sang trái"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Right arrow */}
        {hasMany && (
          <button
            onClick={() => scrollBy(1)}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 ${
              canScrollRight
                ? "bg-circuit-panel/95 border border-circuit-line text-circuit-copperLight hover:bg-circuit-copper hover:text-circuit-bg cursor-pointer"
                : "bg-circuit-panel/40 border border-circuit-line/40 text-circuit-muted/30 cursor-not-allowed"
            }`}
            aria-label="Cuộn sang phải"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Gradient overlays */}
        {hasMany && canScrollRight && (
          <div className="absolute right-8 top-0 bottom-2 w-12 bg-gradient-to-l from-circuit-bg to-transparent pointer-events-none z-[5]" />
        )}
        {hasMany && canScrollLeft && (
          <div className="absolute left-8 top-0 bottom-2 w-12 bg-gradient-to-r from-circuit-bg to-transparent pointer-events-none z-[5]" />
        )}

        {/* Products scroll container */}
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 md:gap-5 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--accent-color) #e2e5ea" }}
        >
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              data-product-card
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="shrink-0 w-[160px] sm:w-[220px] md:w-[260px] h-full"
            >
              <ProductCard product={product} onAddToCart={onAddToCart} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
