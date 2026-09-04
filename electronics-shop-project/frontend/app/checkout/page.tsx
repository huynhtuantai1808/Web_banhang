"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Truck, CreditCard, Tag, Check, X, CalendarClock, User, Building2, ShoppingCart, MapPin, Receipt, FileText } from "lucide-react";
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
  
  // Địa chỉ giao hàng mới
  const [street, setStreet] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [ward, setWard] = useState("");
  
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  // Hóa đơn VAT
  const [requireVAT, setRequireVAT] = useState(false);
  const [vatCompany, setVatCompany] = useState("");
  const [vatTaxCode, setVatTaxCode] = useState("");
  const [vatAddress, setVatAddress] = useState("");
  
  // Các bước Checkout
  const [step, setStep] = useState<1 | 2>(1);
  const [address, setAddress] = useState("");
  const [gateway, setGateway] = useState<"cod" | "vnpay">("cod");
  const [paymentMethod, setPaymentMethod] = useState<"full" | "installment">("full");
  const [installmentType, setInstallmentType] = useState<InstallmentType>("credit_card");
  const [installmentMonths, setInstallmentMonths] = useState<number>(12);
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CREDIT_BANKS = ["Sacombank", "VIB", "HSBC", "Techcombank", "VPBank", "TPBank"];
  const CARD_TYPES = ["VISA", "Mastercard", "JCB"];
  const FINANCE_COMPANIES = ["Home Credit", "FE Credit", "HD Saison"];

  const [selectedBank, setSelectedBank] = useState(CREDIT_BANKS[0]);
  const [selectedCardType, setSelectedCardType] = useState(CARD_TYPES[0]);
  const [selectedFinanceCo, setSelectedFinanceCo] = useState(FINANCE_COMPANIES[0]);
  const [creditDownPayment, setCreditDownPayment] = useState(0);

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
    // Determine payment type from URL
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    if (type === "credit") {
       setPaymentMethod("installment");
       setInstallmentType("credit_card");
    } else if (type === "finance") {
       setPaymentMethod("installment");
       setInstallmentType("finance");
    }

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


  useEffect(() => {
    fetch("https://provinces.open-api.vn/api/p/")
      .then(res => res.json())
      .then(data => setProvinces(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (province) {
      const code = provinces.find(p => p.name === province)?.code;
      if (code) {
        fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`)
          .then(res => res.json())
          .then(data => {
            setDistricts(data.districts);
            setDistrict("");
            setWard("");
            setWards([]);
          })
          .catch(console.error);
      }
    }
  }, [province]);

  useEffect(() => {
    if (district) {
      const code = districts.find(d => d.name === district)?.code;
      if (code) {
        fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`)
          .then(res => res.json())
          .then(data => {
            setWards(data.wards);
            setWard("");
          })
          .catch(console.error);
      }
    }
  }, [district]);

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

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault();
    if (!street.trim() || !province || !district || !ward) {
      setError("Vui lòng điền đầy đủ địa chỉ giao hàng.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!loggedIn && (!guestName.trim() || !guestPhone.trim())) {
      setError("Vui lòng điền họ tên và số điện thoại để chúng tôi liên hệ giao hàng.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (requireVAT && (!vatCompany.trim() || !vatTaxCode.trim() || !vatAddress.trim())) {
      setError("Vui lòng điền đầy đủ thông tin xuất hóa đơn VAT.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    
    // Ghép địa chỉ
    let fullAddress = `${street.trim()}, ${ward}, ${district}, ${province}`;
    if (requireVAT) {
      fullAddress += `\n[Yêu cầu VAT] Cty: ${vatCompany.trim()} - MST: ${vatTaxCode.trim()} - ĐC: ${vatAddress.trim()}`;
    }
    setAddress(fullAddress);
    setError(null);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      let finalAddress = address.trim();
      if (paymentMethod === "installment") {
        if (installmentType === "credit_card") {
          finalAddress += `\n[Trả góp: Ngân hàng ${selectedBank} - Thẻ ${selectedCardType}]`;
        } else {
          finalAddress += `\n[Trả góp: Cty tài chính ${selectedFinanceCo}]`;
        }
      }

      if (loggedIn) {
        const result = await createOrder({
          shippingAddress: finalAddress,
          gateway: paymentMethod === "installment" ? (installmentType === "credit_card" ? "credit_card" : "finance") : gateway,
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
          shippingAddress: finalAddress,
          gateway: paymentMethod === "installment" ? (installmentType === "credit_card" ? "credit_card" : "finance") : gateway,
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
        ) : step === 1 ? (
          <form onSubmit={handleNextStep} className="space-y-6">
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
          <div className="rounded-2xl glass-panel p-6 border-t-4 border-t-circuit-copper/50 space-y-4">
            <label className="block text-[11px] font-mono text-circuit-copperLight uppercase mb-2 tracking-widest font-semibold flex items-center gap-2">
              <MapPin size={16} /> Địa chỉ giao hàng *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                required
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper"
              >
                <option value="">-- Tỉnh / Thành phố --</option>
                {provinces.map(p => <option key={p.code} value={p.name}>{p.name}</option>)}
              </select>
              <select
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                disabled={!province}
                className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper disabled:opacity-50"
              >
                <option value="">-- Quận / Huyện --</option>
                {districts.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
              </select>
              <select
                required
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                disabled={!district}
                className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper disabled:opacity-50"
              >
                <option value="">-- Phường / Xã --</option>
                {wards.map(w => <option key={w.code} value={w.name}>{w.name}</option>)}
              </select>
            </div>
            <input
              type="text"
              required
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Số nhà, tên đường..."
              className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper"
            />
            
            {/* Hóa đơn VAT */}
            <div className="pt-4 border-t border-circuit-line/50 mt-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-circuit-text font-medium">
                <input
                  type="checkbox"
                  checked={requireVAT}
                  onChange={(e) => setRequireVAT(e.target.checked)}
                  className="w-4 h-4 rounded border-circuit-line bg-circuit-bg text-circuit-copper focus:ring-circuit-copper"
                />
                Yêu cầu xuất hóa đơn VAT
              </label>
              
              {requireVAT && (
                <div className="mt-4 space-y-3 bg-circuit-bg/30 p-4 rounded-xl border border-circuit-line/40">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      required
                      value={vatCompany}
                      onChange={(e) => setVatCompany(e.target.value)}
                      placeholder="Tên công ty"
                      className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper"
                    />
                    <input
                      type="text"
                      required
                      value={vatTaxCode}
                      onChange={(e) => setVatTaxCode(e.target.value)}
                      placeholder="Mã số thuế"
                      className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper"
                    />
                  </div>
                  <input
                    type="text"
                    required
                    value={vatAddress}
                    onChange={(e) => setVatAddress(e.target.value)}
                    placeholder="Địa chỉ công ty"
                    className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Cấu hình trả góp */}
          {paymentMethod === "installment" && (
            <div className="rounded-2xl glass-panel border border-circuit-copper/40 shadow-glow p-6">
              <label className="block text-[11px] font-mono text-circuit-copperLight uppercase mb-4 tracking-widest font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-circuit-copper inline-block animate-pulse-slow" />
                Thông tin trả góp
              </label>

              {installmentType === "credit_card" && (
                <div className="mb-6 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-circuit-muted mb-1.5">Chọn ngân hàng trả góp</label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper"
                    >
                      {CREDIT_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-circuit-muted mb-1.5">Loại thẻ</label>
                      <select
                        value={selectedCardType}
                        onChange={(e) => setSelectedCardType(e.target.value)}
                        className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper"
                      >
                        {CARD_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-circuit-muted mb-1.5">Số tiền trả trước (VNĐ)</label>
                      <input
                        type="number"
                        min="0"
                        value={creditDownPayment}
                        onChange={(e) => setCreditDownPayment(Number(e.target.value))}
                        className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper"
                      />
                    </div>
                  </div>
                </div>
              )}

              {installmentType === "finance" && (
                <div className="mb-6 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-circuit-muted mb-1.5">Công ty tài chính</label>
                    <select
                      value={selectedFinanceCo}
                      onChange={(e) => setSelectedFinanceCo(e.target.value)}
                      className="w-full rounded-xl border border-circuit-line/60 bg-circuit-bg/50 px-4 py-3 text-sm text-circuit-text outline-none focus:border-circuit-copper"
                    >
                      {FINANCE_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="rounded-md border border-circuit-line bg-circuit-panel p-4">

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
            </div>
          )}

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
            TIẾP TỤC BƯỚC XÁC NHẬN
          </button>
        </form>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            <div className="rounded-2xl glass-panel p-6 border-t-4 border-t-circuit-copper/50">
              <h2 className="text-lg font-display text-circuit-copperLight mb-4 flex items-center gap-2">
                <Check size={20} /> Xác nhận thông tin đơn hàng
              </h2>
              
              <div className="space-y-4 text-sm">
                <div className="bg-circuit-bg/50 p-4 rounded-xl border border-circuit-line/60">
                  <p className="font-semibold text-circuit-text mb-2">Thông tin người nhận:</p>
                  <p className="text-circuit-muted">{loggedIn ? "Thành viên (xem trong tài khoản)" : `${guestName} - ${guestPhone}`}</p>
                </div>
                
                <div className="bg-circuit-bg/50 p-4 rounded-xl border border-circuit-line/60">
                  <p className="font-semibold text-circuit-text mb-2">Địa chỉ giao hàng & Ghi chú:</p>
                  <p className="text-circuit-muted whitespace-pre-wrap">{address}</p>
                </div>

                <div className="bg-circuit-bg/50 p-4 rounded-xl border border-circuit-line/60">
                  <p className="font-semibold text-circuit-text mb-2">Phương thức thanh toán:</p>
                  <p className="text-circuit-muted">
                    {paymentMethod === "installment" 
                      ? (installmentType === "credit_card" ? `Trả góp thẻ tín dụng (${selectedBank})` : `Trả góp công ty tài chính (${selectedFinanceCo})`)
                      : (gateway === "vnpay" ? "Thanh toán qua VNPay" : "Thanh toán tiền mặt khi nhận hàng (COD)")}
                  </p>
                </div>

                <div className="bg-circuit-bg/50 p-4 rounded-xl border border-circuit-line/60 flex justify-between font-display text-lg text-circuit-text">
                  <span>Tổng tiền thanh toán:</span>
                  <span className="text-circuit-signal">{formatVND(finalTotal)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                disabled={submitting}
                className="w-1/3 flex items-center justify-center gap-2 rounded-xl bg-circuit-panel border border-circuit-line py-4 text-base font-bold text-circuit-text hover:bg-circuit-line/30 transition-all duration-300 disabled:opacity-50"
              >
                QUAY LẠI
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-2/3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-circuit-copper to-circuit-copperLight py-4 text-base font-bold text-circuit-bg hover:shadow-glow hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {submitting && <Loader2 size={20} className="animate-spin" />}
                {paymentMethod === "full" && gateway === "vnpay" ? "TIẾN HÀNH THANH TOÁN (VNPAY)" : "XÁC NHẬN ĐẶT HÀNG"}
              </button>
            </div>
          </div>
        
      )}

      </main>
      <SiteFooter />
    </div>
  );
}
