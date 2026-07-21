"use client";

import { motion } from "framer-motion";
import SearchBar from "@/components/SearchBar";
import FilterTabs from "@/components/FilterTabs";
import ProductCard, { Product } from "@/components/ProductCard";

// Dữ liệu mẫu — thay bằng gọi API thật tới /api/v1/products
const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Laptop Gaming ROG Strix G16",
    brand: "Asus",
    price: 42990000,
    discountPrice: 38990000,
    imageUrl: "/placeholder-laptop.png",
    specHighlight: "i9-14900H / RTX 4070 / 16GB / 1TB",
  },
  {
    id: "2",
    name: "iPhone 16 Pro Max 256GB",
    brand: "Apple",
    price: 34990000,
    imageUrl: "/placeholder-phone.png",
    specHighlight: "A18 Pro / 256GB / Titan",
  },
  {
    id: "3",
    name: "iPad Pro M4 11 inch",
    brand: "Apple",
    price: 26990000,
    discountPrice: 24990000,
    imageUrl: "/placeholder-tablet.png",
    specHighlight: "Chip M4 / 256GB / Wifi",
  },
];

export default function HomePage() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      {/* HERO — thesis: bo mạch điện tử là ngôn ngữ hình ảnh xuyên suốt */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-10 rounded-xl border border-circuit-line bg-circuit-panel px-8 py-14 relative overflow-hidden"
      >
        <p className="font-mono text-circuit-copperLight text-sm tracking-widest uppercase mb-3">
          // TechTrace Store
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-circuit-text max-w-2xl leading-tight">
          Công nghệ chính hãng, kết nối đúng nhu cầu của bạn.
        </h1>
        <p className="text-circuit-muted mt-4 max-w-xl">
          Điện thoại, laptop, máy tính bảng, PC gaming — trả góp 0% lãi suất,
          bảo hành chính hãng, giao nhanh toàn quốc.
        </p>
        <div className="mt-6 max-w-md">
          <SearchBar />
        </div>
      </motion.section>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="md:col-span-1">
          <FilterTabs />
        </aside>

        <section className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SAMPLE_PRODUCTS.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </section>
      </div>
    </main>
  );
}
