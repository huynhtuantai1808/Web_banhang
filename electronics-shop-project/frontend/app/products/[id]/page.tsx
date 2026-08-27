"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, ShoppingCart, Loader2, Check, CreditCard,
  ChevronLeft, ChevronRight, RotateCcw, ZoomIn, X, Heart, Star, ThumbsUp
} from "lucide-react";
import {
  getProduct, listProductImages, getProductReviews,
  ProductOut, ProductImageOut, ReviewOut,
} from "@/lib/services/products";
import { addToCart } from "@/lib/services/cart";
import { addGuestCartItem } from "@/lib/guestCart";
import { isInGuestWishlist, toggleGuestWishlist } from "@/lib/wishlist";
import { isCustomerLoggedIn } from "@/lib/auth-storage";
import { addToWishlist, removeFromWishlist } from "@/lib/services/wishlist";
import { getMediaUrl } from "@/lib/media";
import { CreditCardInstallment, FinanceInstallment } from "@/components/InstallmentTable";
import { ApiError } from "@/lib/apiClient";
import { addRecentlyViewed } from "@/lib/recentlyViewed";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import RichContent from "@/components/RichContent";
import ProductVideo from "@/components/ProductVideo";
import ReviewList from "@/components/ReviewList";
import RelatedProducts from "@/components/RelatedProducts";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

function StarRating({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(value) ? "text-yellow-400 fill-yellow-400" : "text-circuit-line"}
        />
      ))}
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<ProductOut | null>(null);
  const [images, setImages] = useState<ProductImageOut[]>([]);
  const [reviews, setReviews] = useState<ReviewOut[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [autoRotating, setAutoRotating] = useState(false);
  const autoRotateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);
  const [showInstallment, setShowInstallment] = useState(false);
  const [activeTab, setActiveTab] = useState<"mota" | "thongso">("mota");

  const allImages = images.length > 0
    ? images
    : product?.primary_image_url
    ? [{ id: "0", product_id: product.id, url: product.primary_image_url, is_primary: true }]
    : [];

  // ---- Auto-rotate ----
  function startAutoRotate() {
    if (allImages.length <= 1) return;
    if (autoRotateRef.current) return;
    setAutoRotating(true);
    autoRotateRef.current = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % allImages.length);
    }, 4000);
  }

  function stopAutoRotate() {
    if (autoRotateRef.current) {
      clearInterval(autoRotateRef.current);
      autoRotateRef.current = null;
    }
    setAutoRotating(false);
  }

  useEffect(() => () => stopAutoRotate(), []);

  // ---- Load data ----
  useEffect(() => {
    async function load() {
      if (!params.id) return;
      setLoading(true);
      setError(null);
      try {
        const [productData, imageData] = await Promise.all([
          getProduct(params.id),
          listProductImages(params.id).catch(() => [] as ProductImageOut[]),
        ]);
        setProduct(productData);
        setImages(imageData);
        setActiveImageIndex(0);
        stopAutoRotate();

        if (imageData.length > 1 || productData.primary_image_url) {
          setTimeout(() => startAutoRotate(), 2000);
        }

        if (!isCustomerLoggedIn()) {
          setIsWishlisted(isInGuestWishlist(productData.id));
        }

        // Track recently viewed
        addRecentlyViewed(productData.id);

        // Load reviews
        const reviewData = await getProductReviews(params.id).catch(() => [] as ReviewOut[]);
        setReviews(reviewData);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Không tải được thông tin sản phẩm");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  function goToPrev() {
    stopAutoRotate();
    setActiveImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  }

  function goToNext() {
    stopAutoRotate();
    setActiveImageIndex((prev) => (prev + 1) % allImages.length);
  }

  async function handleWishlistToggle() {
    if (!product || togglingWishlist) return;
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
        setIsWishlisted(!isInGuestWishlist(product.id));
      }
      window.dispatchEvent(new Event("wishlist-updated"));
    } catch {
      // silently ignore
    } finally {
      setTogglingWishlist(false);
    }
  }

  async function handleAddToCart() {
    if (!product) return;
    setAdding(true);
    setCartError(null);
    try {
      if (isCustomerLoggedIn()) {
        await addToCart(product.id, 1);
      } else {
        addGuestCartItem(product.id, 1);
      }
      setAdded(true);
      window.dispatchEvent(new Event("cart-updated"));
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      setCartError(err instanceof ApiError ? err.message : "Thêm vào giỏ hàng thất bại");
    } finally {
      setAdding(false);
    }
  }

  async function handleBuyNow(type: "full" | "credit" | "finance" = "full") {
    if (!product) return;
    setAdding(true);
    setCartError(null);
    try {
      if (isCustomerLoggedIn()) {
        await addToCart(product.id, 1);
      } else {
        addGuestCartItem(product.id, 1);
      }
      window.dispatchEvent(new Event("cart-updated"));
      router.push(`/checkout?type=${type}`);
    } catch (err) {
      setCartError(err instanceof ApiError ? err.message : "Thao tác thất bại");
      setAdding(false);
    }
  }

  const activeImageUrl = allImages[activeImageIndex]
    ? getMediaUrl(allImages[activeImageIndex].url)
    : "";

  if (loading) {
    return (
      
    <div className="min-h-screen flex flex-col bg-circuit-bg text-circuit-text">
      <SiteHeader />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-center py-24 text-circuit-muted">
          <Loader2 className="animate-spin mr-2" size={18} /> Đang tải sản phẩm...
        </div>
      </main>
      <SiteFooter />
    </div>
    );
  }

  if (error || !product) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <SiteHeader />
        <div className="rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error ?? "Không tìm thấy sản phẩm"}
        </div>
        <SiteFooter />
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-circuit-bg text-circuit-text">
      <SiteHeader />
      <main className="max-w-5xl mx-auto px-6 pb-8">

      <Link href="/" className="inline-flex items-center gap-2 text-sm text-circuit-muted hover:text-circuit-copperLight mb-6">
        <ArrowLeft size={16} /> Quay lại danh sách sản phẩm
      </Link>

      {/* ── SECTION 1: Gallery + Info (layout giống LaptopS.vn) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* LEFT: Gallery */}
        <div>
          {/* Main image */}
          <div
            className="relative aspect-square rounded-2xl bg-circuit-panel border border-circuit-line flex items-center justify-center overflow-hidden mb-3 group cursor-zoom-in"
            onMouseEnter={stopAutoRotate}
            onMouseLeave={() => allImages.length > 1 && startAutoRotate()}
            onClick={() => { setLightboxIndex(activeImageIndex); setLightboxOpen(true); }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImageUrl || "/placeholder-product.png"}
              alt={product.name}
              className="object-contain h-[90%] w-[90%] transition-transform duration-500 ease-out group-hover:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />

            {/* Prev */}
            {allImages.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-circuit-panel/80 border border-circuit-line flex items-center justify-center text-circuit-copperLight hover:bg-circuit-copper hover:text-circuit-bg transition-all opacity-0 group-hover:opacity-100 shadow-md"
                aria-label="Ảnh trước"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            {/* Next */}
            {allImages.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-circuit-panel/80 border border-circuit-line flex items-center justify-center text-circuit-copperLight hover:bg-circuit-copper hover:text-circuit-bg transition-all opacity-0 group-hover:opacity-100 shadow-md"
                aria-label="Ảnh sau"
              >
                <ChevronRight size={20} />
              </button>
            )}

            {/* Top-right controls */}
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(activeImageIndex); setLightboxOpen(true); }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-circuit-panel/80 border border-circuit-line flex items-center justify-center text-circuit-muted hover:text-circuit-copperLight transition-colors z-10"
              title="Phóng to"
              aria-label="Phóng to ảnh"
            >
              <ZoomIn size={15} />
            </button>
            {allImages.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); autoRotating ? stopAutoRotate() : startAutoRotate(); }}
                className="absolute top-2 right-12 w-8 h-8 rounded-full bg-circuit-panel/80 border border-circuit-line flex items-center justify-center text-circuit-muted hover:text-circuit-copperLight transition-colors z-10"
                title={autoRotating ? "Dừng xoay" : "Tự động xoay"}
              >
                <RotateCcw size={13} className={autoRotating ? "animate-spin" : ""} />
              </button>
            )}

            {/* Counter */}
            {allImages.length > 1 && (
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-circuit-panel/70 border border-circuit-line text-[10px] text-circuit-muted font-mono">
                {activeImageIndex + 1} / {allImages.length}
              </div>
            )}

            {/* Wishlist overlay */}
            <button
              onClick={(e) => { e.stopPropagation(); handleWishlistToggle(); }}
              className={`absolute top-2 left-2 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md z-10 ${
                isWishlisted
                  ? "bg-red-500 text-white"
                  : "bg-circuit-panel/80 border border-circuit-line text-circuit-muted hover:text-red-400 hover:border-red-400/60"
              }`}
              title={isWishlisted ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
            >
              <Heart size={16} fill={isWishlisted ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => { stopAutoRotate(); setActiveImageIndex(idx); }}
                  className={`shrink-0 w-16 h-16 rounded-lg border overflow-hidden transition-all ${
                    idx === activeImageIndex
                      ? "border-2 border-circuit-copper shadow-md"
                      : "border-circuit-line hover:border-circuit-copper/50"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getMediaUrl(img.url)} alt="" className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Product info */}
        <div>
          <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest mb-1">
            {product.brand || "—"} · {product.category || "—"}
          </p>
          <h1 className="font-display text-2xl md:text-3xl text-circuit-text leading-tight mb-2">
            {product.name}
          </h1>
          <p className="text-xs text-circuit-muted font-mono mb-3">Mã SP: {product.product_code}</p>

          {/* Rating badge */}
          {(product.average_rating || product.review_count) && (
            <div className="flex items-center gap-2 mb-4">
              <StarRating value={product.average_rating ?? 0} size={14} />
              <span className="text-sm font-medium text-circuit-text">
                {product.average_rating?.toFixed(1)}
              </span>
              <span className="text-sm text-circuit-muted">
                ({product.review_count} đánh giá)
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-display text-3xl text-circuit-signal">
              {formatVND(product.discount_price || product.price)}
            </span>
            {product.discount_price && (
              <span className="text-base text-circuit-muted line-through">
                {formatVND(product.price)}
              </span>
            )}
          </div>

          {/* Installment (Moved below buttons) */}

          {/* Short description */}
          {product.description && (
            <p className="text-sm text-circuit-muted leading-relaxed mb-5 border-l-2 border-circuit-copper pl-3">
              {product.description}
            </p>
          )}

          {/* Specs summary */}
          {product.specification && Object.keys(product.specification).length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-5">
              {Object.entries(product.specification)
                .slice(0, 4)
                .map(([k, v]) => (
                  <div key={k} className="text-xs">
                    <span className="text-circuit-muted uppercase font-mono">{k}: </span>
                    <span className="text-circuit-text font-medium">{String(v)}</span>
                  </div>
                ))}
            </div>
          )}

          {/* Color / Size */}
          {(product.color || product.size_dimension) && (
            <div className="flex gap-4 mb-5">
              {product.color && (
                <div className="text-sm">
                  <span className="text-circuit-muted font-mono text-xs uppercase">Màu: </span>
                  <span className="text-circuit-text">{product.color}</span>
                </div>
              )}
              {product.size_dimension && (
                <div className="text-sm">
                  <span className="text-circuit-muted font-mono text-xs uppercase">Kích thước: </span>
                  <span className="text-circuit-text">{product.size_dimension}</span>
                </div>
              )}
            </div>
          )}

          {cartError && (
            <div className="mb-3 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              {cartError}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => handleBuyNow('full')}
                disabled={adding}
                className="flex-[2] flex flex-col items-center justify-center rounded-lg bg-[#d70018] text-white py-2.5 transition-colors hover:bg-red-700 shadow-md"
              >
                <span className="font-bold text-[15px] uppercase">Mua ngay</span>
                <span className="text-[11px] font-normal mt-0.5">Giao nhanh từ 2 giờ trong nội thành</span>
              </button>

              <button
                onClick={handleAddToCart}
                disabled={adding}
                className="flex-1 flex flex-col items-center justify-center rounded-lg border border-[#d70018] bg-white text-[#d70018] py-2 transition-colors hover:bg-red-50 shadow-sm"
              >
                {adding ? <Loader2 size={20} className="animate-spin mb-0.5" />
                  : added ? <Check size={20} className="mb-0.5" />
                  : <ShoppingCart size={20} className="mb-0.5" />}
                <span className="text-[11px] font-medium leading-tight">
                  {added ? "Đã thêm" : "Thêm giỏ hàng"}
                </span>
              </button>
            </div>

            {product.is_installment_eligible && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleBuyNow('credit')}
                  disabled={adding}
                  className="flex-1 flex flex-col items-center justify-center rounded-lg bg-[#2f80ed] text-white py-2 transition-colors hover:bg-blue-600 shadow-md disabled:opacity-60"
                >
                  <span className="font-bold text-sm uppercase">Thẻ tín dụng</span>
                  <span className="text-[11px] font-normal mt-0.5">Trả góp 0%</span>
                </button>
                <button
                  onClick={() => handleBuyNow('finance')}
                  disabled={adding}
                  className="flex-1 flex flex-col items-center justify-center rounded-lg bg-[#2f80ed] text-white py-2 transition-colors hover:bg-blue-600 shadow-md disabled:opacity-60"
                >
                  <span className="font-bold text-sm uppercase">Công ty tài chính</span>
                  <span className="text-[11px] font-normal mt-0.5">Duyệt hồ sơ online</span>
                </button>
              </div>
            )}
          </div>

          {/* Hotline */}
          <div className="mt-4 flex items-center gap-2 text-xs text-circuit-muted">
            <span>📞 Gọi đặt hàng:</span>
            <span className="font-mono text-circuit-text">1800-xxxx</span>
            <span className="text-circuit-muted">(8h–22h, Thứ 2–CN)</span>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Tab Mô tả / Thông số (full width) ── */}
      <div className="mb-12">
        {/* Mô tả chi tiết */}
        <div className="space-y-4">
          {/* Tab bar */}
          <div className="flex border-b border-circuit-line/50">
            <button
              onClick={() => setActiveTab("mota")}
              className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                activeTab === "mota"
                  ? "text-circuit-copperLight"
                  : "text-circuit-muted hover:text-circuit-text"
              }`}
            >
              Mô tả chi tiết
              {activeTab === "mota" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-circuit-copper shadow-[0_0_8px_rgba(200,127,69,0.8)]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("thongso")}
              className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                activeTab === "thongso"
                  ? "text-circuit-copperLight"
                  : "text-circuit-muted hover:text-circuit-text"
              }`}
            >
              Thông số kỹ thuật
              {activeTab === "thongso" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-circuit-copper shadow-[0_0_8px_rgba(200,127,69,0.8)]" />
              )}
            </button>
          </div>

          {activeTab === "mota" && (
            <div className="rounded-2xl glass-panel p-6 md:p-8 space-y-6">
              {/* Short description if no long_description */}
              {product.description && (
                <p className="text-sm text-circuit-muted leading-relaxed">{product.description}</p>
              )}

              {/* Rich HTML description */}
              {product.long_description && (
                <RichContent html={product.long_description} />
              )}

              {/* YouTube video embed */}
              <ProductVideo url={product.video_url} />

              {/* Fallback when both are empty */}
              {!product.description && !product.long_description && !product.video_url && (
                <p className="text-sm text-circuit-muted italic">Nội dung mô tả đang được cập nhật.</p>
              )}
            </div>
          )}

          {activeTab === "thongso" && (
            <div className="rounded-2xl glass-panel p-6 md:p-8">
              {product.specification && Object.keys(product.specification).length > 0 ? (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-circuit-line/30">
                    {Object.entries(product.specification).map(([k, v], i) => (
                      <tr key={k} className="hover:bg-circuit-line/10 transition-colors">
                        <td className="px-4 py-2.5 text-circuit-muted font-mono text-xs uppercase w-2/5">{k}</td>
                        <td className="px-4 py-2.5 text-circuit-text font-medium">{String(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-circuit-muted italic">Chưa có thông số kỹ thuật.</p>
              )}
              {(product.color || product.size_dimension || product.material) && (
                <table className="w-full text-sm mt-6">
                  <tbody className="divide-y divide-circuit-line/30">
                    {product.color && (
                      <tr className="hover:bg-circuit-line/10 transition-colors">
                        <td className="px-4 py-2.5 text-circuit-muted font-mono text-xs uppercase">Màu sắc</td>
                        <td className="px-4 py-2.5 text-circuit-text font-medium">{product.color}</td>
                      </tr>
                    )}
                    {product.size_dimension && (
                      <tr className="hover:bg-circuit-line/10 transition-colors">
                        <td className="px-4 py-2.5 text-circuit-muted font-mono text-xs uppercase">Kích thước</td>
                        <td className="px-4 py-2.5 text-circuit-text font-medium">{product.size_dimension}</td>
                      </tr>
                    )}
                    {product.material && (
                      <tr className="hover:bg-circuit-line/10 transition-colors">
                        <td className="px-4 py-2.5 text-circuit-muted font-mono text-xs uppercase">Chất liệu</td>
                        <td className="px-4 py-2.5 text-circuit-text font-medium">{product.material}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── SECTION 3: Đánh giá sản phẩm ── */}
      <div className="rounded-2xl glass-panel p-6 md:p-8 mb-12">
        <ReviewList
          reviews={reviews}
          productId={product.id}
          averageRating={product.average_rating}
          reviewCount={product.review_count}
        />
      </div>

      {/* ── SECTION 4: Sản phẩm liên quan ── */}
      <RelatedProducts productId={product.id} />

      <SiteFooter />

      {/* ── Lightbox ── */}
      {lightboxOpen && product && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightboxOpen(false)}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>

          <div
            className="relative max-w-4xl max-h-[80vh] w-full px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getMediaUrl(allImages[lightboxIndex]?.url) || "/placeholder-product.png"}
              alt={product.name}
              className="max-h-[80vh] w-full object-contain rounded-lg"
            />

            {allImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i - 1 + allImages.length) % allImages.length); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i + 1) % allImages.length); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>

          {allImages.length > 1 && (
            <>
              <div className="flex gap-2 mt-4 px-4 overflow-x-auto max-w-full pb-2">
                {allImages.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                    className={`shrink-0 w-16 h-16 rounded-md border overflow-hidden transition-all ${
                      idx === lightboxIndex ? "border-2 border-circuit-copper" : "border-white/20 hover:border-white/50"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getMediaUrl(img.url)} alt="" className="object-cover w-full h-full" />
                  </button>
                ))}
              </div>
              <p className="text-white/50 text-xs font-mono mt-2">{lightboxIndex + 1} / {allImages.length}</p>
            </>
          )}
        </div>
      )}
    </main>
      <SiteFooter />
    </div>
  );
}
