"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Package, Truck, CreditCard, CheckCircle2, Clock, XCircle, Tag, CalendarClock } from "lucide-react";
import { getOrder, sendOrderEmail, OrderOut } from "@/lib/services/orders";
import { getInstallmentPlan, InstallmentPlanOut } from "@/lib/services/installment";
import { getMyShipment, ShipmentOut, SHIPMENT_STATUS_LABEL } from "@/lib/services/shipments";
import { ApiError } from "@/lib/apiClient";
import { isCustomerLoggedIn } from "@/lib/auth-storage";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

const STATUS_STEPS = [
  { key: "pending", label: "Chờ xác nhận" },
  { key: "confirmed", label: "Đã xác nhận" },
  { key: "shipping", label: "Đang giao" },
  { key: "completed", label: "Hoàn thành" },
];

const PAYMENT_STATUS_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  paid: { label: "Đã thanh toán", icon: <CheckCircle2 size={16} />, color: "text-circuit-signal" },
  pending: { label: "Chờ thanh toán", icon: <Clock size={16} />, color: "text-circuit-muted" },
  failed: { label: "Thanh toán thất bại", icon: <XCircle size={16} />, color: "text-red-400" },
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<OrderOut | null>(null);
  const [installmentPlan, setInstallmentPlan] = useState<InstallmentPlanOut | null>(null);
  const [shipment, setShipment] = useState<ShipmentOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCustomerLoggedIn()) {
      router.replace("/login");
      return;
    }
    async function load() {
      try {
        const data = await getOrder(params.id);
        setOrder(data);
        if (data.has_installment_plan) {
          const plan = await getInstallmentPlan(params.id).catch(() => null);
          setInstallmentPlan(plan);
        }
        const shipmentData = await getMyShipment(params.id);
        setShipment(shipmentData);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Không tải được đơn hàng");
      } finally {
        setLoading(false);
      }
    }
    if (params.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const currentStepIndex = order
    ? order.status === "cancelled"
      ? -1
      : STATUS_STEPS.findIndex((s) => s.key === order.status)
    : -1;

  const [emailLoading, setEmailLoading] = useState<"confirmation" | "invoice" | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  async function handleSendEmail(type: "confirmation" | "invoice") {
    if (!order) return;
    setEmailLoading(type);
    setEmailSuccess(null);
    setError(null);
    try {
      const res = await sendOrderEmail(order.id, type);
      setEmailSuccess(res.message);
      setTimeout(() => setEmailSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gửi email thất bại");
    } finally {
      setEmailLoading(null);
    }
  }

  return (
    
    <div className="min-h-screen flex flex-col bg-circuit-bg text-circuit-text">
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-6 py-10">

      <Link
        href="/orders"
        className="inline-flex items-center gap-2 text-sm text-circuit-muted hover:text-circuit-copperLight mb-6"
      >
        <ArrowLeft size={16} /> Danh sách đơn hàng
      </Link>

      {loading && (
        <div className="flex items-center justify-center py-20 text-circuit-muted">
          <Loader2 className="animate-spin mr-2" size={18} /> Đang tải đơn hàng...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && order && (
        <div className="space-y-6">
          <div className="rounded-2xl glass-panel p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-display text-2xl text-circuit-text flex items-center gap-3">
                  <Package size={24} className="text-circuit-copperLight" /> 
                  #{order.order_code}
                </p>
                <p className="text-sm text-circuit-muted mt-2 flex items-center gap-2">
                  <Clock size={14} />
                  Đặt lúc {new Date(order.created_at).toLocaleString("vi-VN")}
                </p>
              </div>
              {order.status === "cancelled" ? (
                <span className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-red-400/15 text-red-400 border border-red-400/30">
                  Đã huỷ
                </span>
              ) : (
                <span className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase border ${
                  order.status === 'completed' ? 'border-circuit-signal bg-circuit-signal/15 text-circuit-signal' : 'border-circuit-copper/50 bg-circuit-copper/15 text-circuit-copperLight'
                }`}>
                  {STATUS_STEPS.find((s) => s.key === order.status)?.label || order.status}
                </span>
              )}
            </div>

            {/* Thanh tiến trình trạng thái đơn hàng */}
            {order.status !== "cancelled" && (
              <div className="flex items-center mt-8">
                {STATUS_STEPS.map((step, i) => (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-500 ${
                          i <= currentStepIndex
                            ? "bg-circuit-signal border-circuit-signal text-circuit-bg shadow-[0_0_10px_rgba(48,223,147,0.4)] scale-110"
                            : "bg-circuit-bg/50 border-circuit-line text-circuit-muted"
                        }`}
                      >
                        {i + 1}
                      </div>
                      <span className={`text-[11px] mt-2 text-center w-20 font-medium ${
                          i <= currentStepIndex ? "text-circuit-text" : "text-circuit-muted"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className="flex-1 h-0.5 mx-2 relative overflow-hidden bg-circuit-line/50">
                        <div className={`absolute top-0 left-0 h-full transition-all duration-1000 ${
                          i < currentStepIndex ? "w-full bg-circuit-signal" : "w-0 bg-circuit-signal"
                        }`} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Thông tin thanh toán + giao hàng */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl glass-panel p-6">
              <p className="text-[11px] font-mono text-circuit-copperLight uppercase tracking-widest font-semibold mb-4 flex items-center gap-2">
                <CreditCard size={16} /> Thanh toán
              </p>
              <div className={`flex items-center gap-2.5 font-medium ${PAYMENT_STATUS_META[order.payment_status]?.color}`}>
                {PAYMENT_STATUS_META[order.payment_status]?.icon}
                <span className="tracking-wide">{PAYMENT_STATUS_META[order.payment_status]?.label || order.payment_status}</span>
              </div>
              <p className="text-sm text-circuit-muted mt-2">
                Phương thức: <strong className="text-circuit-text font-medium">{order.payment_gateway === "vnpay" ? "VNPay" : "Tiền mặt (COD)"}</strong>
              </p>
            </div>
            <div className="rounded-2xl glass-panel p-6">
              <p className="text-[11px] font-mono text-circuit-copperLight uppercase tracking-widest font-semibold mb-4 flex items-center gap-2">
                <Truck size={16} /> Giao hàng
              </p>
              <p className="text-sm text-circuit-text leading-relaxed">{order.shipping_address || "—"}</p>
            </div>
          </div>

          {/* Danh sách sản phẩm */}
          <div className="rounded-2xl glass-panel p-6">
            <p className="text-[11px] font-mono text-circuit-copperLight uppercase tracking-widest font-semibold mb-4">Sản phẩm</p>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center bg-circuit-bg/30 p-3 rounded-xl border border-circuit-line/30 text-sm">
                  <span className="text-circuit-text font-medium pr-4">
                    {item.product_name} <span className="text-circuit-muted font-mono ml-2">× {item.quantity}</span>
                  </span>
                  <span className="text-circuit-text font-mono font-semibold">
                    {formatVND(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-dashed border-circuit-line/60 mt-6 pt-5 space-y-2.5 text-sm">
              <div className="flex justify-between text-circuit-muted">
                <span>Tạm tính</span>
                <span>{formatVND(order.total_amount)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-circuit-signal">
                  <span className="flex items-center gap-1.5">
                    <Tag size={14} /> Giảm giá{order.promotion_code ? ` (${order.promotion_code})` : ""}
                  </span>
                  <span>-{formatVND(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between items-end font-display pt-2">
                <span className="text-lg text-circuit-text">Tổng cộng</span>
                <span className="text-2xl text-circuit-signal font-bold drop-shadow-[0_0_8px_rgba(48,223,147,0.4)]">{formatVND(order.final_amount)}</span>
              </div>
            </div>
          </div>

          {/* Theo dõi vận chuyển */}
          {shipment && (
            <div className="rounded-2xl glass-panel p-6 border border-circuit-copper/30">
              <p className="text-[11px] font-mono text-circuit-copperLight uppercase tracking-widest font-semibold mb-6 flex items-center gap-2">
                <Truck size={16} /> Vận chuyển — <span className="text-circuit-text">{shipment.carrier}</span>
                {shipment.tracking_code && <span className="bg-circuit-bg/50 px-2 py-0.5 rounded text-circuit-muted ml-2">Mã: {shipment.tracking_code}</span>}
              </p>
              <div className="space-y-0 relative before:absolute before:inset-0 before:ml-[5px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-circuit-line before:to-transparent">
                {[...shipment.logs].reverse().map((log, i) => (
                  <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className={`flex items-center justify-center w-3 h-3 rounded-full border-2 bg-circuit-bg z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${
                        i === 0 ? "border-circuit-signal shadow-[0_0_8px_rgba(48,223,147,0.5)]" : "border-circuit-line/60"
                      }`}
                    />
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl border border-circuit-line/40 bg-circuit-bg/30 mb-4 transition-colors group-hover:border-circuit-line/80">
                      <p className={`font-semibold text-sm mb-1 ${i === 0 ? 'text-circuit-signal' : 'text-circuit-text'}`}>
                        {SHIPMENT_STATUS_LABEL[log.status]}
                      </p>
                      <p className="text-xs text-circuit-muted font-mono flex items-center gap-1.5 mb-1">
                        <Clock size={12} /> {new Date(log.created_at).toLocaleString("vi-VN")}
                      </p>
                      {log.note && <p className="text-xs text-circuit-muted/80 italic mt-2 border-t border-circuit-line/30 pt-2">{log.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lịch trả góp (nếu đơn chọn trả góp) */}
          {installmentPlan && (
            <div className="rounded-2xl glass-panel p-6 border-t-4 border-t-circuit-copper/50">
              <p className="text-[11px] font-mono text-circuit-copperLight uppercase tracking-widest font-semibold mb-6 flex items-center gap-2">
                <CalendarClock size={16} /> Lịch trả góp
                <span className="text-circuit-muted normal-case ml-2 bg-circuit-bg/50 px-2 py-0.5 rounded font-sans">
                  {installmentPlan.total_months} tháng, 0% lãi suất
                </span>
              </p>
              <div className="space-y-3">
                {installmentPlan.payments.map((p) => (
                  <div key={p.period_no} className="flex items-center justify-between text-sm bg-circuit-bg/30 p-4 rounded-xl border border-circuit-line/30 transition-colors hover:border-circuit-copper/30">
                    <div>
                      <p className="font-semibold text-circuit-text mb-1">Kỳ {p.period_no}</p>
                      <p className="text-xs text-circuit-muted flex items-center gap-1.5">
                        <Clock size={12} /> Hạn: {new Date(p.due_date).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-mono font-bold text-circuit-copperLight">{formatVND(p.amount)}</span>
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold ${
                          p.status === "paid"
                            ? "bg-circuit-signal/15 text-circuit-signal border border-circuit-signal/30"
                            : "bg-circuit-line/50 text-circuit-muted border border-circuit-line"
                        }`}
                      >
                        {p.status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
      <SiteFooter />
    </div>
  );
}
