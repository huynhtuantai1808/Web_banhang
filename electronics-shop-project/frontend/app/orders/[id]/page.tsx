"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Package, Truck, CreditCard, CheckCircle2, Clock, XCircle, Tag, CalendarClock } from "lucide-react";
import { getOrder, OrderOut } from "@/lib/services/orders";
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

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <SiteHeader />

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
          <div className="rounded-lg border border-circuit-line bg-circuit-panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg text-circuit-text flex items-center gap-2">
                  <Package size={18} /> {order.order_code}
                </p>
                <p className="text-xs text-circuit-muted mt-1">
                  Đặt lúc {new Date(order.created_at).toLocaleString("vi-VN")}
                </p>
              </div>
              {order.status === "cancelled" ? (
                <span className="px-3 py-1 rounded-full text-xs bg-red-400/15 text-red-300">Đã huỷ</span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs bg-circuit-signal/15 text-circuit-signal">
                  {STATUS_STEPS.find((s) => s.key === order.status)?.label || order.status}
                </span>
              )}
            </div>

            {/* Thanh tiến trình trạng thái đơn hàng */}
            {order.status !== "cancelled" && (
              <div className="flex items-center mt-5">
                {STATUS_STEPS.map((step, i) => (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 ${
                          i <= currentStepIndex
                            ? "bg-circuit-signal border-circuit-signal text-circuit-bg"
                            : "border-circuit-line text-circuit-muted"
                        }`}
                      >
                        {i + 1}
                      </div>
                      <span className="text-[11px] text-circuit-muted mt-1 text-center w-16">
                        {step.label}
                      </span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-1 ${
                          i < currentStepIndex ? "bg-circuit-signal" : "bg-circuit-line"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Thông tin thanh toán + giao hàng */}
          <div className="rounded-lg border border-circuit-line bg-circuit-panel p-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-mono text-circuit-muted uppercase mb-1 flex items-center gap-1.5">
                <CreditCard size={13} /> Thanh toán
              </p>
              <p className={`flex items-center gap-1.5 ${PAYMENT_STATUS_META[order.payment_status]?.color}`}>
                {PAYMENT_STATUS_META[order.payment_status]?.icon}
                {PAYMENT_STATUS_META[order.payment_status]?.label || order.payment_status}
                <span className="text-circuit-muted">
                  ({order.payment_gateway === "vnpay" ? "VNPay" : "COD"})
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs font-mono text-circuit-muted uppercase mb-1 flex items-center gap-1.5">
                <Truck size={13} /> Giao hàng
              </p>
              <p className="text-circuit-text">{order.shipping_address || "—"}</p>
            </div>
          </div>

          {/* Danh sách sản phẩm */}
          <div className="rounded-lg border border-circuit-line bg-circuit-panel p-5">
            <p className="text-xs font-mono text-circuit-muted uppercase mb-3">Sản phẩm</p>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-circuit-text">
                    {item.product_name} × {item.quantity}
                  </span>
                  <span className="text-circuit-muted font-mono">
                    {formatVND(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-circuit-line mt-4 pt-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-circuit-muted">
                <span>Tạm tính</span>
                <span>{formatVND(order.total_amount)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-circuit-signal">
                  <span className="flex items-center gap-1.5">
                    <Tag size={13} /> Giảm giá{order.promotion_code ? ` (${order.promotion_code})` : ""}
                  </span>
                  <span>-{formatVND(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-display text-lg text-circuit-text pt-1">
                <span>Tổng cộng</span>
                <span className="text-circuit-signal">{formatVND(order.final_amount)}</span>
              </div>
            </div>
          </div>

          {/* Theo dõi vận chuyển */}
          {shipment && (
            <div className="rounded-lg border border-circuit-line bg-circuit-panel p-5">
              <p className="text-xs font-mono text-circuit-muted uppercase mb-3 flex items-center gap-1.5">
                <Truck size={14} /> Vận chuyển — {shipment.carrier}
                {shipment.tracking_code && ` (${shipment.tracking_code})`}
              </p>
              <div className="space-y-3">
                {[...shipment.logs].reverse().map((log, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                        i === shipment.logs.length - 1 ? "bg-circuit-signal" : "bg-circuit-line"
                      }`}
                    />
                    <div>
                      <p className="text-sm text-circuit-text">{SHIPMENT_STATUS_LABEL[log.status]}</p>
                      <p className="text-xs text-circuit-muted">
                        {new Date(log.created_at).toLocaleString("vi-VN")}
                        {log.note ? ` — ${log.note}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lịch trả góp (nếu đơn chọn trả góp) */}
          {installmentPlan && (
            <div className="rounded-lg border border-circuit-line bg-circuit-panel p-5">
              <p className="text-xs font-mono text-circuit-muted uppercase mb-3 flex items-center gap-1.5">
                <CalendarClock size={14} /> Lịch trả góp — {installmentPlan.total_months} tháng, 0% lãi suất
              </p>
              <div className="space-y-1.5">
                {installmentPlan.payments.map((p) => (
                  <div key={p.period_no} className="flex items-center justify-between text-sm">
                    <span className="text-circuit-muted">
                      Kỳ {p.period_no} — hạn {new Date(p.due_date).toLocaleDateString("vi-VN")}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-circuit-text">{formatVND(p.amount)}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          p.status === "paid"
                            ? "bg-circuit-signal/15 text-circuit-signal"
                            : "bg-circuit-line text-circuit-muted"
                        }`}
                      >
                        {p.status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <SiteFooter />
    </main>
  );
}
