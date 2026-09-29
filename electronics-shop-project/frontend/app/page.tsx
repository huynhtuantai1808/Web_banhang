"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import SearchBar from "@/components/SearchBar";
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



function HomePageContent() {
  const { settings } = useSiteSettings();
  const router = useRouter();

  const [cartMessage, setCartMessage] = useState<string | null>(null);

  // Nhóm sản phẩm nổi bật (is_hot)
  const [hotProducts, setHotProducts] = useState<Product[]>([]);
  // Nhóm sản phẩm đang giảm giá
  const [onSaleProducts, setOnSaleProducts] = useState<Product[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<{ category: CategoryOption; products: Product[] }[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  const handleSearch = useCallback((kw: string) => {
    if (kw.trim()) {
      router.push(`/category?q=${encodeURIComponent(kw.trim())}`);
    } else {
      router.push("/category");
    }
  }, [router]);

  // Tải nhóm "Đang giảm giá" + nhóm theo 3 danh mục cha đầu tiên — chỉ 1 lần lúc vào trang.
  useEffect(() => {
    async function loadGroups() {
      setGroupsLoading(true);
      try {
        const [hotData, onSaleData, allCategories] = await Promise.all([
          listProducts({ is_hot: true, page_size: 8 }),
          listProducts({ on_sale: true, page_size: 8 }),
          listCategories(),
        ]);

        const allIds = hotData.items.map((p) => p.id);
        const topCategories = allCategories.filter((c) => !c.parent_id).slice(0, 3);
        const catGroupsData = await Promise.all(
          topCategories.map(async (category) => {
            const data = await listProducts({ category_id: category.id, page_size: 4 });
            return { category, products: data.items };
          })
        );

        setHotProducts(hotData.items.map((p) => toDisplayProduct(p)));
        setOnSaleProducts(onSaleData.items.map((p) => toDisplayProduct(p)));
        setCategoryGroups(
          catGroupsData
            .filter((g) => g.products.length > 0)
            .map((g) => ({ category: g.category, products: g.products.map((p) => toDisplayProduct(p)) }))
        );
      } catch {
        setHotProducts([]);
        setOnSaleProducts([]);
        setCategoryGroups([]);
      } finally {
        setGroupsLoading(false);
      }
    }
    loadGroups();
  }, []);



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
        className="mb-6 rounded-xl border border-circuit-line bg-circuit-panel px-6 py-8 relative overflow-hidden"
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
        <h1 className="font-display text-3xl md:text-4xl text-circuit-text max-w-2xl leading-tight">
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

      {!groupsLoading && (
        <>
          <BannerCarousel position="hero" className="mb-8" />
          <BannerCarousel position="promo" className="mb-8" />

          <QuickCategories />
          
          <div className="mb-10">
            <h2 className="font-display text-2xl mb-4 text-circuit-copperLight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-circuit-signal rounded-full"></span>
              Sản phẩm nổi bật
            </h2>
            <div className="rounded-2xl overflow-hidden border border-circuit-line shadow-glow">
              <HotProductsWheel products={hotProducts} />
            </div>
          </div>

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



      </main>
      <SiteFooter />
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="animate-spin text-circuit-copper" size={32} /></div>}>
      <HomePageContent />
    </Suspense>
  );
}
