"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Truck, CreditCard, Tag, Check, X, CalendarClock, User } from "lucide-react";
import { getCart, getAutoDiscountPreview, CartOut } from "@/lib/services/cart";
import { getGuestCart, clearGuestCart } from "@/lib/guestCart";
import { getProduct } from "@/lib/services/products";
import { createOrder, createGuestOrder } from "@/lib/services/orders";
import { validatePromoCode, listMyPromotions, PromotionOut } from "@/lib/services/promotions";
import { calculateInstallment, ALLOWED_INSTALLMENT_MONTHS } from "@/lib/services/installment";
import { getMediaUrl } from "@/lib/media";
import { ApiError } from "@/lib/apiClient";
import { isCustomerLoggedIn } from "@/lib/auth-storage";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

export default function CheckoutPage() {
  const router = useRouter();
  const loggedIn = isCustomerLoggedIn();

  const [cart, setCart] = useState<CartOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState("");
  const [gateway, setGateway] = useState<"cod" | "vnpay">("cod");
  const [paymentMethod, setPaymentMethod] = useState<"full" | "installment">("full");
  const [installmentMonths, setInstallmentMonths] = useState<number>(6);
  const [monthlyPreview, setMonthlyPreview] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Thông tin khách vãng lai (chỉ hiện khi chưa đăng nhập)
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  // Mã khuyến mãi
  const [promoInput, setPromoInput] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [myPromotions, setMyPromotions] = useState<PromotionOut[]>([]);
  const [autoDiscount, setAutoDiscount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        if (loggedIn) {
          const data = await getCart();
          if (data.items.length === 0) {
            router.replace("/cart");
            return;
          }
          setCart(data);
          listMyPromotions().then(setMyPromotions).catch(() => setMyPromotions([]));
          getAutoDiscountPreview().then(setAutoDiscount).catch(() => setAutoDiscount(0));
        } else {
          // Khách vãng lai: dựng giỏ hàng hiển thị từ localStorage (tra chi tiết từng sản phẩm)
          const guestItems = getGuestCart();
          if (guestItems.length === 0) {
            router.replace("/cart");
            return;
          }
          let total = 0;
          const items = [];
          for (const line of guestItems) {
            const product = await getProduct(line.productId);
            const unitPrice = product.discount_price ?? product.price;
            total += unitPrice * line.quantity;
            items.push({
              id: line.productId,
              product_id: product.id,
              product_name: product.name,
              product_price: product.price,
              product_discount_price: product.discount_price ?? null,
              product_image_url: product.primary_image_url ?? null,
              is_installment_eligible: product.is_installment_eligible,
              quantity: line.quantity,
            });
          }
          setCart({ items, total_amount: total });
          // Mã khuyến mãi/chiết khấu tự động yêu cầu đăng nhập để xem trước — với khách vãng lai,
          // hệ thống vẫn TÍNH ĐÚNG lúc đặt hàng thật (POST /orders/guest hỗ trợ promo_code), chỉ
          // là không hiển thị số xem trước ở đây.
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Không tải được giỏ hàng");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotal = cart?.total_amount ?? 0;
  const finalTotal = Math.max(0, subtotal - autoDiscount - (appliedPromo?.discount ?? 0));

  // Tất cả sản phẩm trong giỏ có cho phép trả góp không — nếu 1 sản phẩm không hỗ trợ, hoặc khách
  // chưa đăng nhập (trả góp yêu cầu tài khoản để theo dõi nhiều kỳ thanh toán), ẩn lựa chọn này.
  const allEligibleForInstallment = loggedIn && cart ? cart.items.every((i) => i.is_installment_eligible) : false;

  useEffect(() => {
    if (paymentMethod !== "installment") {
      setMonthlyPreview(null);
      return;
    }
    let cancelled = false;
    calculateInstallment(finalTotal, installmentMonths)
      .then((res) => !cancelled && setMonthlyPreview(res.monthly_amount))
      .catch(() => !cancelled && setMonthlyPreview(null));
    return () => {
      cancelled = true;
    };
  }, [paymentMethod, installmentMonths, finalTotal]);

  async function handleApplyPromo() {
    if (!promoInput.trim() || !loggedIn) return; // xem trước mã KM chỉ khả dụng khi đã đăng nhập
    setPromoChecking(true);
    setPromoMessage(null);
    try {
      const result = await validatePromoCode(promoInput.trim());
      if (result.valid) {
        setAppliedPromo({ code: promoInput.trim(), discount: result.discount_amount });
        setPromoMessage(result.message);
      } else {
        setAppliedPromo(null);
        setPromoMessage(result.message);
      }
    } catch (err) {
      setAppliedPromo(null);
      setPromoMessage(err instanceof ApiError ? err.message : "Không kiểm tra được mã khuyến mãi");
    } finally {
      setPromoChecking(false);
    }
  }

  function clearPromo() {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) {
      setError("Vui lòng nhập địa chỉ giao hàng.");
      return;
    }
    if (!loggedIn && (!guestName.trim() || !guestPhone.trim())) {
      setError("Vui lòng điền họ tên và số điện thoại để chúng tôi liên hệ giao hàng.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (loggedIn) {
        const result = await createOrder({
          shippingAddress: address,
          gateway: paymentMethod === "installment" ? "cod" : gateway,
          paymentMethod,
          installmentMonths: paymentMethod === "installment" ? installmentMonths : undefined,
          promoCode: appliedPromo?.code,
        });
        if (paymentMethod === "full" && gateway === "vnpay" && result.payment_url) {
          window.location.href = result.payment_url;
          return;
        }
        router.push(`/orders/result?payment=cod&order_code=${result.order.order_code}`);
      } else {
        const guestItems = getGuestCart();
        const result = await createGuestOrder({
          fullName: guestName,
          phone: guestPhone,
          email: guestEmail || undefined,
          shippingAddress: address,
          gateway,
          promoCode: promoInput.trim() || undefined,
          items: guestItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        });
        clearGuestCart();
        if (gateway === "vnpay" && result.payment_url) {
          window.location.href = result.payment_url;
          return;
        }
        router.push(`/orders/result?payment=cod&order_code=${result.order.order_code}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đặt hàng thất bại, vui lòng thử lại");
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <SiteHeader />

      <Link
        href="/cart"
        className="inline-flex items-center gap-2 text-sm text-circuit-muted hover:text-circuit-copperLight mb-6"
      >
        <ArrowLeft size={16} /> Quay lại giỏ hàng
      </Link>

      <h1 className="font-display text-2xl text-circuit-text mb-6">Thanh toán đơn hàng</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-circuit-muted">
          <Loader2 className="animate-spin mr-2" size={18} /> Đang tải...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Thông tin khách hàng — chỉ hiện khi chưa đăng nhập (đặt hàng không cần tài khoản) */}
          {!loggedIn && (
            <div className="rounded-lg border border-circuit-line bg-circuit-panel p-4">
              <p className="text-xs font-mono text-circuit-muted uppercase mb-3 flex items-center gap-1.5">
                <User size={14} /> Thông tin đặt hàng (không cần đăng ký tài khoản)
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <label className="block">
                  <span className="block text-xs text-circuit-muted mb-1">Họ và tên *</span>
                  <input
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text outline-none focus:border-circuit-copper"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs text-circuit-muted mb-1">Số điện thoại *</span>
                  <input
                    required
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text outline-none focus:border-circuit-copper"
                  />
                </label>
              </div>
              <label className="block">
                <span className="block text-xs text-circuit-muted mb-1">Email (tuỳ chọn)</span>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text outline-none focus:border-circuit-copper"
                />
              </label>
              <p className="text-xs text-circuit-muted mt-2">
                Thông tin này được lưu lại cùng đơn hàng để bạn tra cứu sau qua{" "}
                <Link href="/orders/lookup" className="text-circuit-copperLight hover:underline">
                  trang tra cứu đơn hàng
                </Link>{" "}
                (chỉ cần mã đơn + số điện thoại, không cần mật khẩu).
              </p>
            </div>
          )}

          {/* Tóm tắt giỏ hàng */}
          {cart && (
            <div className="rounded-lg border border-circuit-line bg-circuit-panel p-4">
              <p className="text-xs font-mono text-circuit-muted uppercase mb-3">Đơn hàng của bạn</p>
              <div className="space-y-2 mb-3">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <div className="w-10 h-10 rounded bg-circuit-bg/60 overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getMediaUrl(item.product_image_url) || "/placeholder-product.png"}
                        alt=""
                        className="object-contain w-full h-full"
                      />
                    </div>
                    <span className="flex-1 text-circuit-text truncate">
                      {item.product_name} × {item.quantity}
                    </span>
                    <span className="text-circuit-muted font-mono">
                      {formatVND((item.product_discount_price ?? item.product_price) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Mã khuyến mãi */}
              <div className="border-t border-circuit-line pt-3 mb-3">
                {!appliedPromo ? (
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 rounded-md border border-circuit-line bg-circuit-bg px-3 py-2">
                      <Tag size={14} className="text-circuit-muted" />
                      <input
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        placeholder="Nhập mã khuyến mãi"
                        className="flex-1 bg-transparent outline-none text-sm text-circuit-text placeholder:text-circuit-muted"
                      />
                    </div>
                    {loggedIn && (
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={promoChecking || !promoInput.trim()}
                        className="rounded-md border border-circuit-copper px-4 text-sm text-circuit-copperLight hover:bg-circuit-copper hover:text-circuit-bg transition-colors disabled:opacity-50"
                      >
                        {promoChecking ? <Loader2 size={14} className="animate-spin" /> : "Áp dụng"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-md border border-circuit-signal/40 bg-circuit-signal/10 px-3 py-2">
                    <span className="flex items-center gap-2 text-sm text-circuit-signal">
                      <Check size={14} /> Mã <strong>{appliedPromo.code}</strong> — giảm{" "}
                      {formatVND(appliedPromo.discount)}
                    </span>
                    <button type="button" onClick={clearPromo} className="text-circuit-muted hover:text-red-400">
                      <X size={14} />
                    </button>
                  </div>
                )}
                {promoMessage && !appliedPromo && (
                  <p className="text-xs text-red-300 mt-1.5">{promoMessage}</p>
                )}
                {!loggedIn && promoInput && (
                  <p className="text-xs text-circuit-muted mt-1.5">
                    Mã sẽ được kiểm tra và áp dụng khi bạn xác nhận đặt hàng.
                  </p>
                )}
                {!appliedPromo && myPromotions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {myPromotions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPromoInput(p.code)}
                        className="text-xs px-2 py-1 rounded-full border border-circuit-line text-circuit-copperLight hover:border-circuit-copper transition-colors"
                        title={p.name}
                      >
                        {p.code}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1 border-t border-circuit-line pt-3 text-sm">
                <div className="flex justify-between text-circuit-muted">
                  <span>Tạm tính</span>
                  <span>{formatVND(subtotal)}</span>
                </div>
                {autoDiscount > 0 && (
                  <div className="flex justify-between text-circuit-signal">
                    <span>Chiết khấu tự động</span>
                    <span>-{formatVND(autoDiscount)}</span>
                  </div>
                )}
                {appliedPromo && (
                  <div className="flex justify-between text-circuit-signal">
                    <span>Giảm giá (mã {appliedPromo.code})</span>
                    <span>-{formatVND(appliedPromo.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-display text-lg text-circuit-text pt-1">
                  <span>Tổng cộng{!loggedIn ? " (tạm tính)" : ""}</span>
                  <span className="text-circuit-signal">{formatVND(finalTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Địa chỉ giao hàng */}
          <div>
            <label className="block text-xs font-mono text-circuit-muted uppercase mb-2">
              <Truck size={14} className="inline mr-1" /> Địa chỉ giao hàng *
            </label>
            <textarea
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
              className="w-full min-h-[80px] rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text outline-none focus:border-circuit-copper"
            />
          </div>

          {/* Hình thức thanh toán: trả toàn bộ hay trả góp (trả góp yêu cầu đăng nhập) */}
          <div className="rounded-lg border-2 border-dashed border-circuit-copper/50 bg-circuit-panel/30 p-4">
            <label className="block text-xs font-mono text-circuit-copperLight uppercase mb-3 tracking-widest">
              ◆ Hình thức thanh toán
            </label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("full")}
                className={`rounded-md border px-4 py-3 text-sm text-left transition-colors ${
                  paymentMethod === "full"
                    ? "border-circuit-copper bg-circuit-copper/15 text-circuit-copperLight"
                    : "border-circuit-line text-circuit-muted hover:border-circuit-copper"
                }`}
              >
                <p className="font-medium">Trả toàn bộ</p>
                <p className="text-xs mt-1 opacity-80">Thanh toán 1 lần</p>
              </button>
              <button
                type="button"
                onClick={() => allEligibleForInstallment && setPaymentMethod("installment")}
                disabled={!allEligibleForInstallment}
                title={!loggedIn ? "Cần đăng nhập để mua trả góp" : undefined}
                className={`rounded-md border px-4 py-3 text-sm text-left transition-colors disabled:opacity-40 ${
                  paymentMethod === "installment"
                    ? "border-circuit-copper bg-circuit-copper/15 text-circuit-copperLight"
                    : "border-circuit-line text-circuit-muted hover:border-circuit-copper"
                }`}
              >
                <p className="font-medium flex items-center gap-1.5">
                  <CalendarClock size={14} /> Trả góp 0% lãi suất
                </p>
                <p className="text-xs mt-1 opacity-80">
                  {loggedIn ? "Chia nhỏ theo tháng" : "Cần đăng nhập để dùng"}
                </p>
              </button>
            </div>

            {paymentMethod === "installment" && (
              <div className="rounded-md border border-circuit-line bg-circuit-panel p-4">
                <p className="text-xs font-mono text-circuit-muted uppercase mb-2">Chọn kỳ hạn</p>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {ALLOWED_INSTALLMENT_MONTHS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setInstallmentMonths(m)}
                      className={`rounded-md border py-2 text-sm transition-colors ${
                        installmentMonths === m
                          ? "border-circuit-copper bg-circuit-copper/15 text-circuit-copperLight"
                          : "border-circuit-line text-circuit-muted hover:border-circuit-copper"
                      }`}
                    >
                      {m} tháng
                    </button>
                  ))}
                </div>
                {monthlyPreview !== null && (
                  <p className="text-sm text-circuit-signal">
                    Chỉ từ <strong>{formatVND(monthlyPreview)}</strong>/tháng × {installmentMonths} tháng
                  </p>
                )}
                <p className="text-xs text-circuit-muted mt-2">
                  Đơn trả góp sẽ được xác nhận qua thanh toán khi nhận hàng (COD) cho kỳ đầu.
                </p>
              </div>
            )}
          </div>

          {/* Chọn cổng thanh toán — chỉ áp dụng khi trả toàn bộ */}
          {paymentMethod === "full" && (
            <div className="rounded-lg border-2 border-dashed border-circuit-copper/50 bg-circuit-panel/30 p-4">
              <label className="block text-xs font-mono text-circuit-copperLight uppercase mb-3 tracking-widest">
                ◆ Cổng thanh toán
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGateway("cod")}
                  className={`rounded-md border px-4 py-3 text-sm text-left transition-colors ${
                    gateway === "cod"
                      ? "border-circuit-copper bg-circuit-copper/15 text-circuit-copperLight"
                      : "border-circuit-line text-circuit-muted hover:border-circuit-copper"
                  }`}
                >
                  <p className="font-medium">Thanh toán khi nhận hàng</p>
                  <p className="text-xs mt-1 opacity-80">Tiền mặt (COD)</p>
                </button>
                <button
                  type="button"
                  onClick={() => setGateway("vnpay")}
                  className={`rounded-md border px-4 py-3 text-sm text-left transition-colors ${
                    gateway === "vnpay"
                      ? "border-circuit-copper bg-circuit-copper/15 text-circuit-copperLight"
                      : "border-circuit-line text-circuit-muted hover:border-circuit-copper"
                  }`}
                >
                  <p className="font-medium">VNPay</p>
                  <p className="text-xs mt-1 opacity-80">ATM / Thẻ quốc tế / QR</p>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-circuit-copper py-3 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-60"
          >
            {submitting && <Loader2 size={18} className="animate-spin" />}
            {paymentMethod === "full" && gateway === "vnpay" ? "Chuyển sang VNPay để thanh toán" : "Đặt hàng"}
          </button>
        </form>
      )}

      <SiteFooter />
    </main>
  );
}
