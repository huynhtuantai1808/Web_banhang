"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  discountPrice?: number;
  imageUrl: string;
  specHighlight: string; // vd: "16GB RAM / 512GB SSD"
}

function formatVND(value: number) {
  return value.toLocaleString("vi-VN") + "₫";
}

export default function ProductCard({ product }: { product: Product }) {
  const [hover, setHover] = useState(false);
  const hasDiscount = !!product.discountPrice && product.discountPrice < product.price;

  return (
    <motion.div
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative rounded-lg bg-circuit-panel border border-circuit-line p-4 overflow-hidden"
    >
      {/* Viền "mạch đồng" chạy quanh card khi hover — chi tiết chữ ký thương hiệu */}
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <rect
          x="1" y="1" width="98" height="98" rx="3"
          fill="none"
          stroke="#C87F45"
          strokeWidth={hover ? 1.2 : 0}
          className={hover ? "pcb-trace" : ""}
          style={{ transition: "stroke-width 0.2s" }}
        />
      </svg>

      <div className="relative z-10">
        <div className="aspect-square rounded-md bg-circuit-bg/60 mb-3 flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt={product.name}
            className="object-contain h-full w-full transition-transform duration-300"
            style={{ transform: hover ? "scale(1.06)" : "scale(1)" }}
          />
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

        <button className="mt-4 w-full rounded-md border border-circuit-copper/60 py-2 text-sm font-medium text-circuit-copperLight hover:bg-circuit-copper hover:text-circuit-bg transition-colors">
          Thêm vào giỏ
        </button>
      </div>
    </motion.div>
  );
}
