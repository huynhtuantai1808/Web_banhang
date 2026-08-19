"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {products.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
          >
            <ProductCard product={product} onAddToCart={onAddToCart} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
