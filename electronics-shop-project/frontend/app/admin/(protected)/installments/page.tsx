"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2, Check, AlertCircle, CreditCard, Building2 } from "lucide-react";
import {
  listInstallmentPlansAdmin, markInstallmentPaymentPaid, InstallmentPlanAdminOut,
} from "@/lib/services/installment";
import { ApiError } from "@/lib/apiClient";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

const PLAN_STATUS_LABEL: Record<string, string> = {
  active: "Đang trả góp", completed: "Đã hoàn tất", overdue: "Quá hạn",
};

// interest_rate stored in DB: credit_card = conversion_fee%, finance = annual_rate%
const INSTALLMENT_TYPES: Record<number, { label: string; icon: React.ElementType }> = {
  0: { label: "Trả góp 0%", icon: CreditCard },
};

function getPlanType(interestRate: number): { label: string; icon: React.ElementType; color: string } {
  if (interestRate === 18 || interestRate === 18.0) {
    return { label: "Công ty tài chính", icon: Building2, color: "text-blue-400" };
  }
  return { label: "Thẻ tín dụng", icon: CreditCard, color: "text-circuit-copper" };
}

export default function AdminInstallmentsPage() {
  const [plans, setPlans] = useState<InstallmentPlanAdminOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPlans(await listInstallmentPlansAdmin());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được danh sách trả góp");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  async function handleMarkPaid(paymentId: string) {
    setMarkingId(paymentId);
    try {
      await markInstallmentPaymentPaid(paymentId);
      await fetchPlans();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đánh dấu thất bại");
    } finally {
      setMarkingId(null);
    }
  }

  const today = new Date();

  return (
    <main className="px-8 py-8 text-circuit-text max-w-4xl">
      <header className="mb-6">
        <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest">Quản trị</p>
        <h1 className="font-display text-2xl mt-1 flex items-center gap-2">
          <CalendarClock size={22} /> Quản lý trả góp
        </h1>
      </header>

      {error && (
        <div className="mb-6 rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-circuit-muted">
          <Loader2 className="animate-spin mr-2" size={18} /> Đang tải...
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 text-circuit-muted">Chưa có đơn hàng trả góp nào.</div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const typeInfo = getPlanType(plan.interest_rate);
            const TypeIcon = typeInfo.icon;
            const isFinance = plan.interest_rate === 18 || plan.interest_rate === 18.0;

            return (
              <div key={plan.id} className="rounded-lg border border-circuit-line bg-circuit-panel p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-circuit-copper/15 flex items-center justify-center mt-0.5">
                      <TypeIcon size={16} className={typeInfo.color} />
                    </div>
                    <div>
                      <p className="font-mono text-circuit-copperLight">{plan.order_code}</p>
                      <p className="text-xs text-circuit-muted mt-1">
                        {plan.customer_name} — {plan.customer_phone}
                      </p>
                      <p className={`text-xs font-medium mt-1 ${typeInfo.color}`}>
                        {typeInfo.label}
                        {isFinance && ` · 18%/năm · Trả trước 20%`}
                        {!isFinance && plan.interest_rate > 0 && ` · Phí ${plan.interest_rate}%`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        plan.status === "completed"
                          ? "bg-circuit-signal/15 text-circuit-signal"
                          : "bg-circuit-line text-circuit-muted"
                      }`}
                    >
                      {PLAN_STATUS_LABEL[plan.status] || plan.status}
                    </span>
                    {plan.down_payment > 0 && (
                      <span className="text-xs text-circuit-muted">
                        Đã trả trước: {formatVND(plan.down_payment)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-circuit-muted mb-3 pl-12">
                  {plan.total_months} tháng × {formatVND(plan.monthly_amount)}/tháng
                </div>

                <div className="space-y-1.5">
                  {plan.payments.map((p) => {
                    const isOverdue = p.status !== "paid" && new Date(p.due_date) < today;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-sm rounded-md px-2 py-1.5"
                      >
                        <span className="flex items-center gap-1.5 text-circuit-muted">
                          {isOverdue && <AlertCircle size={13} className="text-red-400" />}
                          Kỳ {p.period_no} — hạn {new Date(p.due_date).toLocaleDateString("vi-VN")}
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="font-mono text-circuit-text">{formatVND(p.amount)}</span>
                          {p.status === "paid" ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-circuit-signal/15 text-circuit-signal flex items-center gap-1">
                              <Check size={11} /> Đã thu
                            </span>
                          ) : (
                            <button
                              onClick={() => handleMarkPaid(p.id)}
                              disabled={markingId !== null}
                              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                isOverdue
                                  ? "border-red-400/50 text-red-300 hover:bg-red-400/10"
                                  : "border-circuit-line text-circuit-muted hover:border-circuit-copper hover:text-circuit-copperLight"
                              }`}
                            >
                              Đánh dấu đã thu
                            </button>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
