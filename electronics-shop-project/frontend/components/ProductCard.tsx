"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, ShoppingCart, Check } from "lucide-react";

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  discountPrice?: number;
  imageUrl: string;
  images?: string[]; // thêm images để ProductCard không phải gọi API riêng
  specHighlight: string; // vd: "16GB RAM / 512GB SSD"
}

function formatVND(value: number) {
  return value.toLocaleString("vi-VN") + "₫";
}

export default function ProductCard({
  product,
  onAddToCart,
}: {
  product: Product;
  /** Gọi khi bấm "Thêm vào giỏ". Component cha xử lý gọi API + điều hướng đăng nhập nếu cần. */
  onAddToCart?: (productId: string) => Promise<void> | void;
}) {
  const [hover, setHover] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [images, setImages] = useState<string[]>([product.imageUrl]);
  const [imgIdx, setImgIdx] = useState(0);
  const hasDiscount = !!product.discountPrice && product.discountPrice < product.price;

  // Load additional product images — use prop if available (preloaded by parent), otherwise fetch
  useEffect(() => {
    if (product.images && product.images.length > 0) {
      setImages(product.images);
      return;
    }
    listProductImages(product.id)
      .then((imgs) => {
        const urls = imgs.length > 0
          ? imgs.map((img) => img.url)
          : [product.imageUrl];
        setImages(urls);
      })
      .catch(() => setImages([product.imageUrl]));
  }, [product.id, product.imageUrl, product.images]);

  // Auto-rotate images every 3 seconds when not hovering
  useEffect(() => {
    if (images.length <= 1 || hover) return;
    const timer = setInterval(() => {
      setImgIdx((i) => (i + 1) % images.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [images.length, hover]);

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!onAddToCart || adding) return;
    setAdding(true);
    try {
      await onAddToCart(product.id);
      setAdded(true);
      window.dispatchEvent(new Event("cart-updated"));
      setTimeout(() => setAdded(false), 1500);
    } finally {
      setAdding(false);
    }
  }

  return (
    <motion.div
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative rounded-lg bg-circuit-panel border border-circuit-line p-4 overflow-hidden"
      style={{ borderColor: hover ? "var(--accent-color)" : undefined, transition: "border-color 0.2s" }}
    >
      <Link href={`/products/${product.id}`} className="block relative z-10">
        {/* Image gallery */}
        <div
          className="aspect-square rounded-md bg-circuit-bg/60 mb-3 flex items-center justify-center overflow-hidden relative"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[imgIdx]}
            alt={product.name}
            className="object-contain h-full w-full transition-transform duration-300"
            style={{ transform: hover ? "scale(1.06)" : "scale(1)" }}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='200' height='200' fill='%23121B2E'/></svg>";
            }}
          />

          {/* Navigation dots */}
          {images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.preventDefault();
                    setImgIdx(i);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === imgIdx ? "bg-circuit-copper" : "bg-circuit-line hover:bg-circuit-muted"
                  }`}
                  aria-label={`Ảnh ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <p className="text-xs font-mono text-circuit-copperLight uppercase tracking-wide">
          {product.brand}
        </p>
        <h3 className="font-display text-circuit-text text-base leading-snug mt-1 line-clamp-2">
          {product.name}
        </h3>
        <p className="text-xs text-circuit-muted font-mono mt-1">{product.specHighlight}</p>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-display text-lg text-circuit-signal">
            {formatVND(hasDiscount ? product.discountPrice! : product.price)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-circuit-muted line-through">
              {formatVND(product.price)}
            </span>
          )}
        </div>
      </Link>

      <button
        onClick={handleAddToCart}
        disabled={adding}
        style={{ borderColor: "var(--accent-color)", color: "var(--accent-color-light)" }}
        className="relative z-10 mt-4 w-full flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-medium hover:text-circuit-bg transition-colors disabled:opacity-60"
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-color)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        {adding ? (
          <Loader2 size={16} className="animate-spin" />
        ) : added ? (
          <Check size={16} />
        ) : (
          <ShoppingCart size={16} />
        )}
        {added ? "Đã thêm vào giỏ" : "Thêm vào giỏ"}
      </button>
    </motion.div>
  );
}
