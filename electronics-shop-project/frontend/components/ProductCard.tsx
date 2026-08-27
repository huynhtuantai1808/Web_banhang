"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, ShoppingCart, Check, Heart } from "lucide-react";
import { toggleGuestWishlist, isInGuestWishlist } from "@/lib/wishlist";
import { isCustomerLoggedIn } from "@/lib/auth-storage";
import { addToWishlist, removeFromWishlist } from "@/lib/services/wishlist";
import { getMediaUrl } from "@/lib/media";



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
  const [images, setImages] = useState<string[]>([getMediaUrl(product.imageUrl)]);
  const [imgIdx, setImgIdx] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);
  const hasDiscount = !!product.discountPrice && product.discountPrice < product.price;

  // Check initial wishlist state
  useEffect(() => {
    if (!isCustomerLoggedIn()) {
      setIsWishlisted(isInGuestWishlist(product.id));
    }
  }, [product.id]);

  // Load additional product images if provided
  useEffect(() => {
    if (product.images && product.images.length > 0) {
      setImages(product.images.map((u) => getMediaUrl(u)));
    } else {
      setImages([getMediaUrl(product.imageUrl)]);
    }
  }, [product.imageUrl, product.images]);

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

  async function handleWishlistToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (togglingWishlist) return;
    setTogglingWishlist(true);
    try {
      if (isCustomerLoggedIn()) {
        if (isWishlisted) {
          await removeFromWishlist(product.id);
          setIsWishlisted(false);
        } else {
          await addToWishlist(product.id);
          setIsWishlisted(true);
        }
      } else {
        toggleGuestWishlist(product.id);
        setIsWishlisted(isInGuestWishlist(product.id));
      }
      window.dispatchEvent(new Event("wishlist-updated"));
    } catch {
      // silently ignore errors on toggle
    } finally {
      setTogglingWishlist(false);
    }
  }

  return (
    <motion.div
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="premium-card rounded-2xl p-5 flex flex-col h-full group"
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-premium-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <Link href={`/products/${product.id}`} className="block relative z-10 flex-1">
        {/* Image gallery */}
        <div
          className="aspect-square rounded-xl bg-circuit-bg/40 mb-4 flex items-center justify-center overflow-hidden relative border border-circuit-line/30 group-hover:border-circuit-copper/30 transition-colors"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[imgIdx]}
            alt={product.name}
            className="object-cover h-full w-full transition-transform duration-500 ease-out drop-shadow-2xl"
            style={{ transform: hover ? "scale(1.08)" : "scale(1)" }}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='200' height='200' fill='%23121B2E'/></svg>";
            }}
          />

          {/* Wishlist button */}
          <button
            onClick={handleWishlistToggle}
            className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isWishlisted
                ? "bg-red-500 text-white"
                : "bg-circuit-panel/80 border border-circuit-line text-circuit-muted hover:text-red-400 hover:border-red-400/60"
            }`}
            title={isWishlisted ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
          >
            <Heart size={14} fill={isWishlisted ? "currentColor" : "none"} />
          </button>

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

        <p className="text-[11px] font-mono text-circuit-copperLight uppercase tracking-widest mt-4">
          {product.brand}
        </p>
        <h3 className="font-display text-circuit-text text-base leading-snug mt-1.5 line-clamp-2 group-hover:text-circuit-copperLight transition-colors">
          {product.name}
        </h3>
        <p className="text-xs text-circuit-muted font-mono mt-1.5">{product.specHighlight}</p>

        <div className="flex items-baseline gap-2 mt-4">
          <span className="font-display text-lg font-semibold text-circuit-signal group-hover:text-circuit-signal/90 transition-colors">
            {formatVND(hasDiscount ? product.discountPrice! : product.price)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-circuit-muted line-through opacity-70">
              {formatVND(product.price)}
            </span>
          )}
        </div>
      </Link>

      <button
        onClick={handleAddToCart}
        disabled={adding}
        className="relative z-10 mt-5 w-full flex items-center justify-center gap-2 rounded-xl border border-circuit-copper/30 bg-circuit-copper/5 py-2.5 text-sm font-medium text-circuit-copperLight hover:bg-circuit-copper hover:text-circuit-bg transition-all duration-300 disabled:opacity-50 disabled:hover:bg-transparent shadow-sm hover:shadow-glow"
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
