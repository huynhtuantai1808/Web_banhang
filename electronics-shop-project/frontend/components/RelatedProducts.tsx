"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ProductOut, getRelatedProducts, getProduct } from "@/lib/services/products";
import { getMediaUrl } from "@/lib/media";

interface RelatedProductsProps {
  productId: string;
}

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

export default function RelatedProducts({ productId }: RelatedProductsProps) {
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    getRelatedProducts(productId, 8)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading || products.length === 0) return null;

  function scroll(dir: "left" | "right") {
    if (!scrollEl) return;
    scrollEl.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  }

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl text-circuit-text">Sản phẩm liên quan</h3>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-full border border-circuit-line flex items-center justify-center text-circuit-muted hover:border-circuit-copper hover:text-circuit-copperLight transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-full border border-circuit-line flex items-center justify-center text-circuit-muted hover:border-circuit-copper hover:text-circuit-copperLight transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={setScrollEl}
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="shrink-0 w-[220px] rounded-lg border border-circuit-line bg-circuit-panel overflow-hidden hover:border-circuit-copper transition-colors group"
          >
            <div className="aspect-square bg-circuit-bg/60 flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getMediaUrl(p.primary_image_url) || "/placeholder-product.png"}
                alt={p.name}
                className="object-contain h-full w-full group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-3">
              <p className="text-xs font-mono text-circuit-copperLight uppercase truncate">{p.brand}</p>
              <p className="text-sm text-circuit-text mt-1 line-clamp-2 leading-snug">{p.name}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-base text-circuit-signal">
                  {formatVND(p.discount_price ?? p.price)}
                </span>
                {p.discount_price && (
                  <span className="text-xs text-circuit-muted line-through">
                    {formatVND(p.price)}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
