"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SearchBar from "@/components/SearchBar";
import FilterTabs from "@/components/FilterTabs";
import ProductCard, { Product } from "@/components/ProductCard";
import SiteHeader from "@/components/SiteHeader";
import { listProducts, ProductOut } from "@/lib/services/products";
import { getMediaUrl } from "@/lib/media";
import { ApiError } from "@/lib/apiClient";
import { Loader2 } from "lucide-react";

/** Chuyển đổi dữ liệu thô từ Backend sang shape mà <ProductCard> cần hiển thị. */
function toDisplayProduct(p: ProductOut): Product {
  const spec = p.specification
    ? Object.entries(p.specification).map(([k, v]) => `${k}: ${v}`).join(" / ")
    : [p.color, p.size_dimension].filter(Boolean).join(" / ");

  return {
    id: p.id,
    name: p.name,
    brand: p.brand || "",
    price: p.price,
    discountPrice: p.discount_price ?? undefined,
    imageUrl: getMediaUrl((p as any).primary_image_url) || "/placeholder-product.png",
    specHighlight: spec || "—",
  };
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProducts(keyword?: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await listProducts(keyword ? { keyword } : {});
      setProducts(data.map(toDisplayProduct));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Không tải được sản phẩm từ máy chủ. Vui lòng thử lại sau."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <SiteHeader />

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
          <SearchBar onSearch={loadProducts} />
        </div>
      </motion.section>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="md:col-span-1">
          <FilterTabs />
        </aside>

        <section className="md:col-span-3">
          {loading && (
            <div className="flex items-center justify-center py-20 text-circuit-muted">
              <Loader2 className="animate-spin mr-2" size={18} /> Đang tải sản phẩm từ máy chủ...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="text-center py-20 text-circuit-muted">
              Chưa có sản phẩm nào. Hãy nhập sản phẩm ở trang quản trị.
            </div>
          )}

          {!loading && !error && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
