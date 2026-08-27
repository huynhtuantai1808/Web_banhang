"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Truck, CreditCard, Tag, Check, X, CalendarClock, User, Building2, ShoppingCart } from "lucide-react";
import { getCart, getAutoDiscountPreview, CartOut } from "@/lib/services/cart";
import { getGuestCart, clearGuestCart } from "@/lib/guestCart";
import { getProduct } from "@/lib/services/products";
import { createOrder, createGuestOrder } from "@/lib/services/orders";
import { validatePromoCode, listMyPromotions, PromotionOut } from "@/lib/services/promotions";
import {
  getInstallmentOptions, InstallmentOption, InstallmentType,
  CREDIT_CARD_MONTHS, FINANCE_MONTHS,
} from "@/lib/services/installment";
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
  const [installmentType, setInstallmentType] = useState<InstallmentType>("credit_card");
  const [installmentMonths, setInstallmentMonths] = useState<number>(12);
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([]);
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
    if (paymentMethod !== "installment" || !allEligibleForInstallment) {
      setInstallmentOptions([]);
      return;
    }
    let cancelled = false;
    getInstallmentOptions(finalTotal, installmentType)
      .then((res) => { if (!cancelled) setInstallmentOptions(res.options); })
      .catch(() => { if (!cancelled) setInstallmentOptions([]); });
    return () => { cancelled = true; };
  }, [paymentMethod, allEligibleForInstallment, finalTotal, installmentType]);

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
          installmentType: paymentMethod === "installment" ? installmentType : undefined,
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
    <div className="min-h-screen flex flex-col bg-circuit-bg text-circuit-text">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-6 pb-10">

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
            <div className="rounded-2xl glass-panel p-6 border-t-4 border-t-circuit-copper/50">
              <p className="text-[11px] font-mono text-circuit-copperLight uppercase mb-4 flex items-center gap-1.5 tracking-widest font-semibold">
                <User size={16} /> Thông tin người nhận
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <label className="block">
                  <span className="block text-xs text-circuit-muted mb-1.5 font-medium">Họ và tên *</span>
                  <input
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper transition-colors focus:shadow-[0_0_10px_rgba(200,127,69,0.15)]"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs text-circuit-muted mb-1.5 font-medium">Số điện thoại *</span>
                  <input
                    required
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper transition-colors focus:shadow-[0_0_10px_rgba(200,127,69,0.15)]"
                  />
                </label>
              </div>
              <label className="block">
                <span className="block text-xs text-circuit-muted mb-1.5 font-medium">Email (tuỳ chọn)</span>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper transition-colors focus:shadow-[0_0_10px_rgba(200,127,69,0.15)]"
                />
              </label>
              <p className="text-[11px] text-circuit-muted mt-3">
                Thông tin này được lưu lại cùng đơn hàng để bạn tra cứu sau qua{" "}
                <Link href="/orders/lookup" className="text-circuit-copperLight hover:underline font-medium">
                  trang tra cứu đơn hàng
                </Link>{" "}
                (chỉ cần mã đơn + số điện thoại, không cần mật khẩu).
              </p>
            </div>
          )}

          {/* Tóm tắt giỏ hàng */}
          {cart && (
            <div className="rounded-2xl glass-panel p-6 border-t-4 border-t-circuit-copper/50">
              <p className="text-[11px] font-mono text-circuit-copperLight uppercase tracking-widest mb-4 font-semibold flex items-center gap-2">
                <ShoppingCart size={16} /> Đơn hàng của bạn
              </p>
              <div className="space-y-3 mb-4">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <div className="w-12 h-12 rounded-xl bg-circuit-bg/40 border border-circuit-line/30 overflow-hidden shrink-0 flex items-center justify-center p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getMediaUrl(item.product_image_url) || "/placeholder-product.png"}
                        alt=""
                        className="object-contain w-full h-full"
                      />
                    </div>
                    <span className="flex-1 text-circuit-text truncate font-medium">
                      {item.product_name} × {item.quantity}
                    </span>
                    <span className="text-circuit-muted font-mono font-semibold">
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
          <div className="rounded-2xl glass-panel p-6 border-t-4 border-t-circuit-copper/50">
            <label className="block text-[11px] font-mono text-circuit-copperLight uppercase mb-4 tracking-widest font-semibold flex items-center gap-2">
              <Truck size={16} /> Địa chỉ giao hàng *
            </label>
            <textarea
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
              className="w-full min-h-[100px] rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper transition-colors focus:shadow-[0_0_10px_rgba(200,127,69,0.15)] resize-y"
            />
          </div>

          {/* Hình thức thanh toán: trả toàn bộ hay trả góp (trả góp yêu cầu đăng nhập) */}
          <div className="rounded-2xl glass-panel border border-circuit-copper/40 shadow-glow p-6">
            <label className="block text-[11px] font-mono text-circuit-copperLight uppercase mb-4 tracking-widest font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-circuit-copper inline-block animate-pulse-slow" />
              Hình thức thanh toán
            </label>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                type="button"
                onClick={() => setPaymentMethod("full")}
                className={`rounded-xl border-2 px-5 py-4 text-sm text-left transition-all duration-300 hover:scale-[1.02] ${
                  paymentMethod === "full"
                    ? "border-circuit-copper bg-circuit-copper/15 text-circuit-copperLight shadow-[0_0_15px_rgba(200,127,69,0.2)]"
                    : "border-circuit-line/60 bg-circuit-panel/50 text-circuit-muted hover:border-circuit-copper/60 hover:bg-circuit-panel/80"
                }`}
              >
                <p className="font-medium flex items-center gap-1.5 text-base">
                  <span className={`w-2 h-2 rounded-full inline-block transition-colors ${paymentMethod === "full" ? "bg-circuit-copper" : "bg-circuit-muted"}`} />
                  Trả toàn bộ
                </p>
                <p className="text-[11px] mt-1.5 opacity-80 uppercase tracking-wide">Thanh toán 1 lần</p>
              </button>
              <button
                type="button"
                onClick={() => allEligibleForInstallment && setPaymentMethod("installment")}
                disabled={!allEligibleForInstallment}
                title={!loggedIn ? "Cần đăng nhập để mua trả góp" : undefined}
                className={`rounded-xl border-2 px-5 py-4 text-sm text-left transition-all duration-300 hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100 ${
                  paymentMethod === "installment"
                    ? "border-circuit-copper bg-circuit-copper/15 text-circuit-copperLight shadow-[0_0_15px_rgba(200,127,69,0.2)]"
                    : "border-circuit-line/60 bg-circuit-panel/50 text-circuit-muted hover:border-circuit-copper/60 hover:bg-circuit-panel/80"
                }`}
              >
                <p className="font-medium flex items-center gap-1.5 text-base">
                  <CalendarClock size={16} /> Trả góp 0%
                </p>
                <p className="text-[11px] mt-1.5 opacity-80 uppercase tracking-wide">
                  {loggedIn ? "Chia nhỏ theo tháng" : "Cần đăng nhập"}
                </p>
              </button>
            </div>

            {paymentMethod === "installment" && (
              <div className="rounded-md border border-circuit-line bg-circuit-panel p-4">
                {/* Tab chọn loại trả góp */}
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => { setInstallmentType("credit_card"); setInstallmentMonths(12); }}
                    className={`flex-1 rounded-md border py-2.5 px-3 text-sm text-left transition-colors ${
                      installmentType === "credit_card"
                        ? "border-circuit-copper bg-circuit-copper/15 text-circuit-copperLight"
                        : "border-circuit-line text-circuit-muted hover:border-circuit-copper/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard size={14} />
                      <div>
                        <p className="font-medium">Thẻ tín dụng</p>
                        <p className="text-xs opacity-70">0% lãi suất · Có phí chuyển đổi</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setInstallmentType("finance"); setInstallmentMonths(12); }}
                    className={`flex-1 rounded-md border py-2.5 px-3 text-sm text-left transition-colors ${
                      installmentType === "finance"
                        ? "border-circuit-copper bg-circuit-copper/15 text-circuit-copperLight"
                        : "border-circuit-line text-circuit-muted hover:border-circuit-copper/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 size={14} />
                      <div>
                        <p className="font-medium">Công ty tài chính</p>
                        <p className="text-xs opacity-70">Trả trước 20% · Lãi suất giảm dần</p>
                      </div>
                    </div>
                  </button>
                </div>

                {installmentOptions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-circuit-line">
                          <th className="py-1.5 text-left text-circuit-muted font-mono uppercase">Kỳ hạn</th>
                          {installmentType === "finance" ? (
                            <>
                              <th className="py-1.5 text-right text-circuit-muted font-mono uppercase">Trả trước (20%)</th>
                              <th className="py-1.5 text-right text-circuit-muted font-mono uppercase">Khoản vay</th>
                              <th className="py-1.5 text-right text-circuit-muted font-mono uppercase">Lãi suất</th>
                            </>
                          ) : (
                            <>
                              <th className="py-1.5 text-right text-circuit-muted font-mono uppercase">Phí (%)</th>
                              <th className="py-1.5 text-right text-circuit-muted font-mono uppercase">Số tiền phí</th>
                            </>
                          )}
                          <th className="py-1.5 text-right text-circuit-muted font-mono uppercase">Tổng cộng</th>
                          <th className="py-1.5 text-right text-circuit-copperLight font-mono uppercase">Mỗi tháng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {installmentOptions.map((opt) => (
                          <tr
                            key={`${opt.type}-${opt.months}`}
                            onClick={() => setInstallmentMonths(opt.months)}
                            className={`border-b border-circuit-line/50 cursor-pointer transition-colors hover:bg-circuit-panel/60 ${
                              installmentMonths === opt.months ? "bg-circuit-copper/10" : ""
                            }`}
                          >
                            <td className={`py-1.5 font-mono ${installmentMonths === opt.months ? "text-circuit-copperLight font-semibold" : "text-circuit-text"}`}>
                              {opt.months} tháng {installmentMonths === opt.months && "✓"}
                            </td>
                            {installmentType === "finance" ? (
                              <>
                                <td className="py-1.5 text-right text-circuit-muted">
                                  {opt.down_payment_amount != null ? formatVND(opt.down_payment_amount) : "—"}
                                </td>
                                <td className="py-1.5 text-right text-circuit-muted">
                                  {opt.loan_amount != null ? formatVND(opt.loan_amount) : "—"}
                                </td>
                                <td className="py-1.5 text-right text-circuit-muted">
                                  {opt.monthly_interest_rate != null ? `${opt.monthly_interest_rate.toFixed(2)}%/tháng` : "—"}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-1.5 text-right text-circuit-muted">{opt.conversion_fee}%</td>
                                <td className="py-1.5 text-right text-circuit-muted">
                                  {opt.fee_amount != null ? formatVND(opt.fee_amount) : "—"}
                                </td>
                              </>
                            )}
                            <td className="py-1.5 text-right text-circuit-text font-medium">{formatVND(opt.total_amount)}</td>
                            <td className="py-1.5 text-right font-bold text-circuit-copperLight">
                              {formatVND(opt.monthly_payment ?? opt.monthly_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-circuit-muted text-center py-4">Đang tải bảng trả góp...</p>
                )}

                {installmentOptions.find((o) => o.months === installmentMonths) && (() => {
                  const sel = installmentOptions.find((o) => o.months === installmentMonths)!;
                  return (
                    <div className="mt-3 flex items-center gap-2 text-xs text-circuit-muted">
                      <CalendarClock size={12} />
                      <span>
                        Tổng cộng: <strong className="text-circuit-text">{formatVND(sel.total_amount)}</strong>
                        {installmentType === "finance" && sel.down_payment_amount != null && (
                          <> · Trả trước <strong className="text-circuit-text">{formatVND(sel.down_payment_amount)}</strong></>
                        )}
                        {" "}— mỗi tháng{" "}
                        <strong className="text-circuit-copperLight">
                          {formatVND(sel.monthly_payment ?? sel.monthly_amount)}
                        </strong>
                      </span>
                    </div>
                  );
                })()}

                <p className="text-[10px] text-circuit-muted mt-3 border-t border-circuit-line pt-2">
                  {installmentType === "credit_card"
                    ? "* Phí chuyển đổi trả góp do ngân hàng/phát hành thẻ tín dụng áp dụng."
                    : "* Lãi suất 1.5%/tháng (18%/năm) trên dư nợ giảm dần. Phí xử lý do công ty tài chính quy định."}
                </p>
              </div>
            )}
          </div>

          {/* Chọn cổng thanh toán — chỉ áp dụng khi trả toàn bộ */}
          {paymentMethod === "full" && (
            <div className="rounded-2xl glass-panel p-6 border-t-4 border-t-circuit-copper/50">
              <label className="block text-[11px] font-mono text-circuit-copperLight uppercase mb-4 tracking-widest font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-circuit-copper inline-block animate-pulse-slow" />
                Cổng thanh toán
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setGateway("cod")}
                  className={`relative rounded-xl border-2 px-5 py-4 text-sm text-left transition-all duration-300 hover:scale-[1.02] ${
                    gateway === "cod"
                      ? "border-circuit-copper bg-circuit-copper/15 text-circuit-copperLight shadow-[0_0_15px_rgba(200,127,69,0.2)]"
                      : "border-circuit-line/60 bg-circuit-panel/50 text-circuit-muted hover:border-circuit-copper/60 hover:bg-circuit-panel/80"
                  }`}
                >
                  {gateway === "cod" && (
                    <span className="absolute -top-2.5 left-4 px-2 py-0.5 text-[10px] font-mono font-bold bg-circuit-signal text-circuit-bg rounded-md shadow-md">
                      GỢI Ý
                    </span>
                  )}
                  <p className="font-medium flex items-center gap-2 text-base">
                    <Truck size={16} /> Tiền mặt (COD)
                  </p>
                  <p className="text-[11px] mt-1.5 opacity-80 uppercase tracking-wide">Thanh toán khi nhận hàng</p>
                </button>
                <button
                  type="button"
                  onClick={() => setGateway("vnpay")}
                  className={`relative rounded-xl border-2 px-5 py-4 text-sm text-left transition-all duration-300 hover:scale-[1.02] ${
                    gateway === "vnpay"
                      ? "border-blue-400 bg-blue-400/10 text-blue-300 shadow-[0_0_15px_rgba(96,165,250,0.2)]"
                      : "border-circuit-line/60 bg-circuit-panel/50 text-circuit-muted hover:border-blue-400/60 hover:bg-circuit-panel/80"
                  }`}
                >
                  <p className="font-medium flex items-center gap-2 text-base">
                    <CreditCard size={16} /> VNPay
                  </p>
                  <p className="text-[11px] mt-1.5 opacity-80 uppercase tracking-wide">ATM / Thẻ quốc tế / QR</p>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-circuit-copper to-circuit-copperLight py-4 text-base font-bold text-circuit-bg hover:shadow-glow hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none mt-8"
          >
            {submitting && <Loader2 size={20} className="animate-spin" />}
            {paymentMethod === "full" && gateway === "vnpay" ? "TIẾN HÀNH THANH TOÁN (VNPAY)" : "XÁC NHẬN ĐẶT HÀNG"}
          </button>
        </form>
      )}

      </main>
      <SiteFooter />
    </div>
  );
}
