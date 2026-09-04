"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
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
  const { settings } = useSiteSettings();

  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);

  // Nhóm sản phẩm hiển thị ở trạng thái mặc định (chưa tìm kiếm/lọc gì) — theo khuyến mãi
  // (đang giảm giá) và theo từng nhóm danh mục nổi bật.
  const [onSaleProducts, setOnSaleProducts] = useState<Product[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<{ category: CategoryOption; products: Product[] }[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  const isBrowsingDefault = !keyword && Object.values(filters).every((v) => !v);

  /** Ghép từ khoá tìm kiếm + toàn bộ lựa chọn ở FilterTabs (danh mục/hãng/giá/chức năng)
   * thành 1 lần gọi API duy nhất — đây là tính năng "lọc kết hợp nhiều điều kiện" được yêu cầu:
   * VD: keyword="điện thoại" + brand="Samsung" + priceLabel="< 10tr" + feature="Gaming". */
  const loadProducts = useCallback(async (kw: string, f: FilterState) => {
    setLoading(true);
    setError(null);
    try {
      const params: ProductFilters = { keyword: kw || undefined, brand: f.brand, category: f.category, feature: f.feature, sort_by: f.sort_by };
      const range = f.priceLabel ? PRICE_RANGES[f.priceLabel] : undefined;
      if (range) Object.assign(params, range);

      const data = await listProducts(params);
      setProducts(data.items.map((p) => toDisplayProduct(p)));
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
    loadProducts(kw, filters);
  }, [loadProducts, filters]);

  useEffect(() => {
    loadProducts(keyword, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]); // đổi filter → tự động tải lại; đổi keyword thì chờ người dùng bấm Enter (xem SearchBar)

  // Tải nhóm "Đang giảm giá" + nhóm theo 3 danh mục cha đầu tiên — chỉ 1 lần lúc vào trang.
  useEffect(() => {
    async function loadGroups() {
      setGroupsLoading(true);
      try {
        const [onSaleData, allCategories] = await Promise.all([
          listProducts({ on_sale: true, page_size: 8 }),
          listCategories(),
        ]);

        const allIds = onSaleData.items.map((p) => p.id);
        const topCategories = allCategories.filter((c) => !c.parent_id).slice(0, 3);
        const catGroupsData = await Promise.all(
          topCategories.map(async (category) => {
            const data = await listProducts({ category_id: category.id, page_size: 4 });
            return { category, products: data.items };
          })
        );

        setOnSaleProducts(onSaleData.items.map((p) => toDisplayProduct(p)));
        setCategoryGroups(
          catGroupsData
            .filter((g) => g.products.length > 0)
            .map((g) => ({ category: g.category, products: g.products.map((p) => toDisplayProduct(p)) }))
        );
      } catch {
        setOnSaleProducts([]);
        setCategoryGroups([]);
      } finally {
        setGroupsLoading(false);
      }
    }
    loadGroups();
  }, []);

  function handleFilterChange(next: FilterState) {
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
    <>
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-6 pb-10">

      {/* HERO — thesis: bo mạch điện tử là ngôn ngữ hình ảnh xuyên suốt */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 rounded-xl border border-circuit-line bg-circuit-panel px-8 py-14 relative overflow-hidden"
        style={
          settings.banner_image_url
            ? {
                backgroundImage: `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.92)), url(${getMediaUrl(
                  settings.banner_image_url
                )})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <p
          className="font-mono text-sm tracking-widest uppercase mb-3"
          style={{ color: "var(--accent-color-light)" }}
        >
          // {settings.hero_subtitle}
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-circuit-text max-w-2xl leading-tight">
          {settings.hero_title}
        </h1>
        <p className="text-circuit-muted mt-4 max-w-xl">{settings.hero_description}</p>
      </motion.section>

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

      {/* Nhóm sản phẩm mặc định (khuyến mãi + theo danh mục) — chỉ hiện khi chưa tìm/lọc gì */}
      {isBrowsingDefault && !groupsLoading && (
        <>
          <BannerCarousel position="hero" className="mb-8" />
          <BannerCarousel position="promo" className="mb-8" />

          <RecentlyViewed />

          <ProductRow
            title="🔥 Đang giảm giá"
            products={onSaleProducts}
            onAddToCart={handleAddToCart}
          />
          {categoryGroups.map(({ category, products: catProducts }) => (
            <ProductRow
              key={category.id}
              title={category.name}
              products={catProducts}
              viewAllHref={`/category/${category.slug}`}
              onAddToCart={handleAddToCart}
            />
          ))}
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="md:col-span-1">
          <FilterTabs value={filters} onChange={handleFilterChange} />
        </aside>

        <section className="md:col-span-3">
          {!isBrowsingDefault && (
            <p className="text-sm text-circuit-muted mb-4">Kết quả lọc/tìm kiếm:</p>
          )}

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
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
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
          )}
        </section>
      </div>

      </main>
      <SiteFooter />
    </>
  );
}
