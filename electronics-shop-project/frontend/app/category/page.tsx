"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, ChevronRight } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import FilterTabs, { FilterState } from "@/components/FilterTabs";
import ProductCard, { Product } from "@/components/ProductCard";
import ProductRow from "@/components/ProductRow";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CategoryMenu from "@/components/CategoryMenu";
import { listProducts, listCategories, ProductOut, ProductFilters, CategoryOption } from "@/lib/services/products";
import { addToCart } from "@/lib/services/cart";
import { addGuestCartItem } from "@/lib/guestCart";
import { getMediaUrl } from "@/lib/media";
import { ApiError } from "@/lib/apiClient";
import { isCustomerLoggedIn } from "@/lib/auth-storage";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import RecentlyViewed from "@/components/RecentlyViewed";
import BannerCarousel from "@/components/BannerCarousel";
import QuickCategories from "@/components/QuickCategories";
import HotProductsWheel from "@/components/HotProductsWheel";

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
    imageUrl: getMediaUrl(p.primary_image_url) || "/placeholder-product.svg",
    specHighlight: spec || "—",
    averageRating: p.average_rating ?? undefined,
    reviewCount: p.review_count ?? undefined,
    stockQuantity: p.stock_quantity ?? 0,
  };
}



function CategoryPageContent() {
  const { settings } = useSiteSettings();
  const searchParams = useSearchParams();
  
  const urlKw = searchParams.get("q") || "";
  const urlCat = searchParams.get("category") || undefined;

  const [keyword, setKeyword] = useState(urlKw);
  const [filters, setFilters] = useState<FilterState>({ category: urlCat });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);

  // Nhóm sản phẩm nổi bật (is_hot)

  // Nhóm sản phẩm nổi bật (is_hot)

  /** Ghép từ khoá tìm kiếm + toàn bộ lựa chọn ở FilterTabs (danh mục/hãng/giá/chức năng)
   * thành 1 lần gọi API duy nhất — đây là tính năng "lọc kết hợp nhiều điều kiện" được yêu cầu:
   * VD: keyword="điện thoại" + brand="Samsung" + priceLabel="< 10tr" + feature="Gaming". */
  const loadProducts = useCallback(async (kw: string, f: FilterState, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: ProductFilters = { keyword: kw || undefined, brand: f.brand, category: f.category, feature: f.feature, sort_by: f.sort_by, page: p, page_size: 20 };
      const range = f.priceLabel ? PRICE_RANGES[f.priceLabel] : undefined;
      if (range) Object.assign(params, range);

      const data = await listProducts({ ...params, grouped: true });
      setProducts(data.items.map((prod) => toDisplayProduct(prod)));
      setTotalPages(data.total_pages || 1);
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

  const handleSearch = useCallback((kw: string) => {
    setKeyword(kw);
    setPage(1);
    loadProducts(kw, filters, 1);
  }, [loadProducts, filters]);

  // React to URL changes (e.g. from QuickCategories)
  useEffect(() => {
    setKeyword(urlKw);
    setFilters((prev) => ({ ...prev, category: urlCat }));
    setPage(1);
  }, [urlKw, urlCat]);

  useEffect(() => {
    loadProducts(keyword, filters, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]); // đổi filter hoặc page → tự động tải lại; đổi keyword thì chờ người dùng bấm Enter (xem SearchBar)

  function handleFilterChange(next: FilterState) {
    setPage(1);
    setFilters(next);
  }

  async function handleAddToCart(productId: string) {
    if (!isCustomerLoggedIn()) {
      addGuestCartItem(productId, 1);
      setCartMessage("Đã thêm vào giỏ hàng (mua không cần tài khoản).");
      setTimeout(() => setCartMessage(null), 2500);
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
    <main className="max-w-7xl mx-auto px-6 pb-10 mt-6">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <CategoryMenu />
        <div className="flex-1 min-w-[240px]">
          <SearchBar onSearch={handleSearch} />
        </div>
      </div>

      {cartMessage && (
        <div className="mb-6 rounded-md border border-circuit-line bg-circuit-panel px-4 py-3 text-sm text-circuit-signal">
          {cartMessage}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-sm text-circuit-muted mb-6">
        <Link href="/" className="hover:text-circuit-copperLight">Trang chủ</Link>
        <ChevronRight size={14} />
        <span className="text-circuit-copper">Tất cả sản phẩm</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="md:col-span-1">
          <FilterTabs value={filters} onChange={handleFilterChange} />
        </aside>

        <section className="md:col-span-3">
          {keyword && (
            <p className="text-sm text-circuit-muted mb-4">Kết quả tìm kiếm cho: "{keyword}"</p>
          )}

          {loading && products.length === 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-circuit-panel/50 animate-pulse rounded-xl border border-circuit-line h-[360px]" />
              ))}
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

          {!error && products.length > 0 && (
            <>
              <div className={`grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 transition-opacity ${loading ? "opacity-50 pointer-events-none" : ""}`}>
                {products.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    className="h-full"
                  >
                    <ProductCard product={product} onAddToCart={handleAddToCart} />
                  </motion.div>
                ))}
              </div>
              
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-10">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-4 py-2 rounded-md border border-circuit-line disabled:opacity-50 text-sm hover:border-circuit-copper transition-colors"
                  >
                    Trang trước
                  </button>
                  <span className="text-sm font-mono text-circuit-copperLight px-4">
                    {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 rounded-md border border-circuit-line disabled:opacity-50 text-sm hover:border-circuit-copper transition-colors"
                  >
                    Trang sau
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      </main>
  );
}

export default function CategoryPage() {
  return (
    <div className="min-h-screen flex flex-col bg-circuit-bg text-circuit-text">
      <SiteHeader />
      <Suspense fallback={<div className="flex-1 flex justify-center p-20"><Loader2 className="animate-spin text-circuit-copper" size={32} /></div>}>
        <CategoryPageContent />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
