"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingCart, Loader2, Check, CreditCard } from "lucide-react";
import { getProduct, listProductImages, ProductOut, ProductImageOut } from "@/lib/services/products";
import { addToCart } from "@/lib/services/cart";
import { calculateInstallment } from "@/lib/services/installment";
import { getMediaUrl } from "@/lib/media";
import { ApiError } from "@/lib/apiClient";
import { isCustomerLoggedIn } from "@/lib/auth-storage";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<ProductOut | null>(null);
  const [images, setImages] = useState<ProductImageOut[]>([]);
  const [activeImage, setActiveImage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [installmentPreview, setInstallmentPreview] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [productData, imageData] = await Promise.all([
          getProduct(params.id),
          listProductImages(params.id).catch(() => []), // không chặn trang nếu lỗi lấy ảnh phụ
        ]);
        setProduct(productData);
        setImages(imageData);
        const primary =
          imageData.find((img) => img.is_primary)?.url || productData.primary_image_url || imageData[0]?.url;
        setActiveImage(getMediaUrl(primary) || "");

        if (productData.is_installment_eligible) {
          const price = productData.discount_price || productData.price;
          calculateInstallment(price, 12)
            .then((res) => setInstallmentPreview(res.monthly_amount))
            .catch(() => setInstallmentPreview(null));
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Không tải được thông tin sản phẩm");
      } finally {
        setLoading(false);
      }
    }
    if (params.id) load();
  }, [params.id]);

  async function handleAddToCart() {
    if (!isCustomerLoggedIn()) {
      router.push("/login");
      return;
    }
    if (!product) return;
    setAdding(true);
    setCartError(null);
    try {
      await addToCart(product.id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      setCartError(err instanceof ApiError ? err.message : "Thêm vào giỏ hàng thất bại");
    } finally {
      setAdding(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <SiteHeader />

      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-circuit-muted hover:text-circuit-copperLight mb-6"
      >
        <ArrowLeft size={16} /> Quay lại danh sách sản phẩm
      </Link>

      {loading && (
        <div className="flex items-center justify-center py-24 text-circuit-muted">
          <Loader2 className="animate-spin mr-2" size={18} /> Đang tải sản phẩm...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && product && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-10"
        >
          {/* Ảnh sản phẩm */}
          <div>
            <div className="aspect-square rounded-lg bg-circuit-panel border border-circuit-line flex items-center justify-center overflow-hidden mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImage || "/placeholder-product.png"}
                alt={product.name}
                className="object-contain h-full w-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(getMediaUrl(img.url))}
                    className="w-16 h-16 shrink-0 rounded-md border border-circuit-line overflow-hidden hover:border-circuit-copper"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getMediaUrl(img.url)} alt="" className="object-cover w-full h-full" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Thông tin sản phẩm */}
          <div>
            <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest">
              {product.brand || "—"} · {product.category || "—"}
            </p>
            <h1 className="font-display text-2xl md:text-3xl text-circuit-text mt-2">{product.name}</h1>
            <p className="font-mono text-xs text-circuit-muted mt-1">Mã SP: {product.product_code}</p>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-display text-3xl text-circuit-signal">
                {formatVND(product.discount_price || product.price)}
              </span>
              {product.discount_price && (
                <span className="text-base text-circuit-muted line-through">
                  {formatVND(product.price)}
                </span>
              )}
            </div>

            {product.is_installment_eligible && (
              <p className="mt-2 flex items-center gap-2 text-sm text-circuit-copperLight">
                <CreditCard size={16} />
                {installmentPreview
                  ? `Trả góp chỉ từ ${formatVND(installmentPreview)}/tháng (12 tháng, 0% lãi suất)`
                  : "Hỗ trợ mua trả góp 0% lãi suất"}
              </p>
            )}

            {product.description && (
              <p className="mt-5 text-sm text-circuit-muted leading-relaxed">{product.description}</p>
            )}

            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              {product.color && (
                <div>
                  <dt className="text-circuit-muted font-mono text-xs uppercase">Màu/chất liệu</dt>
                  <dd className="text-circuit-text">{product.color}</dd>
                </div>
              )}
              {product.size_dimension && (
                <div>
                  <dt className="text-circuit-muted font-mono text-xs uppercase">Kích thước</dt>
                  <dd className="text-circuit-text">{product.size_dimension}</dd>
                </div>
              )}
              {product.specification &&
                Object.entries(product.specification).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-circuit-muted font-mono text-xs uppercase">{k}</dt>
                    <dd className="text-circuit-text">{String(v)}</dd>
                  </div>
                ))}
            </dl>

            {cartError && (
              <div className="mt-4 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
                {cartError}
              </div>
            )}

            <button
              onClick={handleAddToCart}
              disabled={adding}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-md bg-circuit-copper py-3 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-60"
            >
              {adding ? (
                <Loader2 size={18} className="animate-spin" />
              ) : added ? (
                <Check size={18} />
              ) : (
                <ShoppingCart size={18} />
              )}
              {added ? "Đã thêm vào giỏ hàng" : "Thêm vào giỏ hàng"}
            </button>
          </div>
        </motion.div>
      )}

      <SiteFooter />
    </main>
  );
}
