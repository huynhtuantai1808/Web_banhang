"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRecentlyViewed } from "@/lib/recentlyViewed";
import { getProduct } from "@/lib/services/products";
import { getMediaUrl } from "@/lib/media";
import { ProductOut } from "@/lib/services/products";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

export default function RecentlyViewed() {
  const [products, setProducts] = useState<ProductOut[]>([]);

  useEffect(() => {
    const viewed = getRecentlyViewed();
    if (viewed.length === 0) return;

    Promise.all(viewed.map((v) => getProduct(v.productId).catch(() => null)))
      .then((results) => {
        const valid = results.filter((p): p is ProductOut => p !== null);
        setProducts(valid);
      })
      .catch(() => {});
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="font-display text-lg text-circuit-text mb-4">Sản phẩm đã xem</h2>
      <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {products.slice(0, 6).map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="shrink-0 w-[160px] rounded-lg border border-circuit-line bg-circuit-panel overflow-hidden hover:border-circuit-copper transition-colors group"
          >
            <div className="aspect-square bg-circuit-bg/60 flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getMediaUrl(p.primary_image_url) || "/placeholder-product.png"}
                alt={p.name}
                className="object-contain h-full w-full group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-2">
              <p className="text-xs text-circuit-text line-clamp-2 leading-tight">{p.name}</p>
              <p className="font-display text-sm text-circuit-signal mt-1">
                {formatVND(p.discount_price ?? p.price)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
