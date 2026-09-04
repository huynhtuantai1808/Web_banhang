"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import FilterTabs, { FilterState } from "@/components/FilterTabs";
import ProductCard, { Product } from "@/components/ProductCard";
import { listProducts, listCategories, ProductOut, CategoryOption } from "@/lib/services/products";
import { addToCart } from "@/lib/services/cart";
import { addGuestCartItem } from "@/lib/guestCart";
import { getMediaUrl } from "@/lib/media";
import { ApiError } from "@/lib/apiClient";
import { isCustomerLoggedIn } from "@/lib/auth-storage";

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

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();

  const [category, setCategory] = useState<CategoryOption | null>(null);
  const [parentCategory, setParentCategory] = useState<CategoryOption | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const allCategories = await listCategories();
        const decodedSlug = decodeURIComponent(params.slug);
        const current = allCategories.find((c) => c.slug === decodedSlug);
        if (!current) {
          setError("Không tìm thấy danh mục này.");
          setLoading(false);
          return;
        }
        setCategory(current);
        const parent = current.parent_id ? allCategories.find((c) => c.id === current.parent_id) : null;
        setParentCategory(parent || null);

        const data = await listProducts({ category_id: current.id, ...buildFilterParams(filters) });
        setProducts(data.items.map(toDisplayProduct));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Không tải được danh mục sản phẩm");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug, filters]);

  function buildFilterParams(f: FilterState) {
    const priceRanges: Record<string, { min_price?: number; max_price?: number }> = {
      "< 10tr": { max_price: 10_000_000 },
      "10-20tr": { min_price: 10_000_000, max_price: 20_000_000 },
      "20-40tr": { min_price: 20_000_000, max_price: 40_000_000 },
      "> 40tr": { min_price: 40_000_000 },
    };
    const range = f.priceLabel ? priceRanges[f.priceLabel] : undefined;
    return { brand: f.brand, feature: f.feature, sort_by: f.sort_by, ...range };
  }

  async function handleAddToCart(productId: string) {
    if (!isCustomerLoggedIn()) {
      addGuestCartItem(productId, 1);
      setCartMessage("Đã thêm vào giỏ hàng (khách vãng lai).");
      setTimeout(() => setCartMessage(null), 2500);
      return;
    }
    try {
      await addToCart(productId, 1);
      setCartMessage("Đã thêm sản phẩm vào giỏ hàng.");
    } catch (err) {
      setCartMessage(err instanceof ApiError ? err.message : "Thêm vào giỏ hàng thất bại.");
    }
    setTimeout(() => setCartMessage(null), 2500);
  }

  return (
    <div className="min-h-screen flex flex-col bg-circuit-bg text-circuit-text">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-6 pb-10">

      {/* Breadcrumb kiểu "Laptop > Gaming Laptop" */}
      <div className="flex items-center gap-1.5 text-sm text-circuit-muted mb-6">
        <Link href="/" className="hover:text-circuit-copperLight">Trang chủ</Link>
        {parentCategory && (
          <>
            <ChevronRight size={14} />
            <Link href={`/category/${parentCategory.slug}`} className="hover:text-circuit-copperLight">
              {parentCategory.name}
            </Link>
          </>
        )}
        {category && (
          <>
            <ChevronRight size={14} />
            <span className="text-circuit-text">{category.name}</span>
          </>
        )}
      </div>

      {category?.banner_image_url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8 rounded-xl border border-circuit-line overflow-hidden h-40 relative"
          style={{
            backgroundImage: `linear-gradient(rgba(11,18,32,0.5), rgba(11,18,32,0.75)), url(${getMediaUrl(category.banner_image_url)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 flex items-center px-8">
            <h1 className="font-display text-3xl text-white">{category.name}</h1>
          </div>
        </motion.div>
      )}
      {category && !category.banner_image_url && (
        <h1 className="font-display text-2xl text-circuit-text mb-6">{category.name}</h1>
      )}

      {cartMessage && (
        <div className="mb-6 rounded-md border border-circuit-line bg-circuit-panel px-4 py-3 text-sm text-circuit-signal">
          {cartMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="md:col-span-1">
          <FilterTabs value={filters} onChange={setFilters} />
        </aside>

        <section className="md:col-span-3">
          {loading && (
            <div className="flex items-center justify-center py-20 text-circuit-muted">
              <Loader2 className="animate-spin mr-2" size={18} /> Đang tải sản phẩm...
            </div>
          )}
          {!loading && error && (
            <div className="rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
          {!loading && !error && products.length === 0 && (
            <div className="text-center py-20 text-circuit-muted">Chưa có sản phẩm nào trong danh mục này.</div>
          )}
          {!loading && !error && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
    </div>
  );
}
