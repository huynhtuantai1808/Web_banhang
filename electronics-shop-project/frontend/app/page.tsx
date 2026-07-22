"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import FilterTabs, { FilterState } from "@/components/FilterTabs";
import ProductCard, { Product } from "@/components/ProductCard";
import SiteHeader from "@/components/SiteHeader";
import { listProducts, ProductOut, ProductFilters } from "@/lib/services/products";
import { addToCart } from "@/lib/services/cart";
import { getMediaUrl } from "@/lib/media";
import { ApiError } from "@/lib/apiClient";
import { isCustomerLoggedIn } from "@/lib/auth-storage";
import { BRANDING } from "@/lib/branding";

// Khoảng giá hiển thị trên FilterTabs → khoảng min/max thực tế gửi xuống Backend (đơn vị: VNĐ)
const PRICE_RANGES: Record<string, { min_price?: number; max_price?: number }> = {
  "< 10tr": { max_price: 10_000_000 },
  "10-20tr": { min_price: 10_000_000, max_price: 20_000_000 },
  "20-40tr": { min_price: 20_000_000, max_price: 40_000_000 },
  "> 40tr": { min_price: 40_000_000 },
};

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
    imageUrl: getMediaUrl(p.primary_image_url) || "/placeholder-product.png",
    specHighlight: spec || "—",
  };
}

export default function HomePage() {
  const router = useRouter();

  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);

  /** Ghép từ khoá tìm kiếm + toàn bộ lựa chọn ở FilterTabs (danh mục/hãng/giá/chức năng)
   * thành 1 lần gọi API duy nhất — đây là tính năng "lọc kết hợp nhiều điều kiện" được yêu cầu:
   * VD: keyword="điện thoại" + brand="Samsung" + priceLabel="< 10tr" + feature="Gaming". */
  const loadProducts = useCallback(async (kw: string, f: FilterState) => {
    setLoading(true);
    setError(null);
    try {
      const params: ProductFilters = { keyword: kw || undefined, brand: f.brand, category: f.category, feature: f.feature };
      const range = f.priceLabel ? PRICE_RANGES[f.priceLabel] : undefined;
      if (range) Object.assign(params, range);

      const data = await listProducts(params);
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
  }, []);

  useEffect(() => {
    loadProducts(keyword, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]); // đổi filter → tự động tải lại; đổi keyword thì chờ người dùng bấm Enter (xem SearchBar)

  function handleFilterChange(next: FilterState) {
    setFilters(next);
  }

  function handleSearch(kw: string) {
    setKeyword(kw);
    loadProducts(kw, filters);
  }

  async function handleAddToCart(productId: string) {
    if (!isCustomerLoggedIn()) {
      router.push("/login");
      return;
    }
    try {
      await addToCart(productId, 1);
      setCartMessage("Đã thêm sản phẩm vào giỏ hàng.");
      setTimeout(() => setCartMessage(null), 2500);
    } catch (err) {
      setCartMessage(err instanceof ApiError ? err.message : "Thêm vào giỏ hàng thất bại.");
      setTimeout(() => setCartMessage(null), 3000);
    }
  }

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
          // {BRANDING.siteName} Store
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-circuit-text max-w-2xl leading-tight">
          {BRANDING.tagline}
        </h1>
        <p className="text-circuit-muted mt-4 max-w-xl">{BRANDING.description}</p>
        <div className="mt-6 max-w-md">
          <SearchBar onSearch={handleSearch} />
        </div>
      </motion.section>

      {cartMessage && (
        <div className="mb-6 rounded-md border border-circuit-line bg-circuit-panel px-4 py-3 text-sm text-circuit-signal">
          {cartMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="md:col-span-1">
          <FilterTabs value={filters} onChange={handleFilterChange} />
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
              Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.
            </div>
          )}

          {!loading && !error && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <ProductCard product={product} onAddToCart={handleAddToCart} />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
