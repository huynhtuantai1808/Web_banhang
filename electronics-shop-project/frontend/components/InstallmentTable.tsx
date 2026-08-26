"use client";

import { useEffect, useState } from "react";
import { CreditCard, Building2, Loader2 } from "lucide-react";
import {
  InstallmentOption, InstallmentType, getInstallmentOptions, getInstallmentInfo,
  InstallmentInfo,
} from "@/lib/services/installment";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

interface InstallmentTableProps {
  amount: number;
  selectedType: InstallmentType;
  selectedMonths: number | null;
  onSelect: (months: number) => void;
}

export default function InstallmentTable({ amount, selectedType, selectedMonths, onSelect }: InstallmentTableProps) {
  const [options, setOptions] = useState<InstallmentOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getInstallmentOptions(amount, selectedType)
      .then((res) => { if (!cancelled) setOptions(res.options); })
      .catch(() => { if (!cancelled) setOptions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
  }, [amount, selectedType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin text-circuit-muted mr-2" />
        <span className="text-sm text-circuit-muted">Đang tính...</span>
      </div>
    );
  }

  if (options.length === 0) return null;

  const isFinance = selectedType === "finance";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-circuit-line">
            <th className="py-2 text-left text-circuit-muted font-mono uppercase">Kỳ hạn</th>
            {isFinance ? (
              <>
                <th className="py-2 text-right text-circuit-muted font-mono uppercase">Trả trước (20%)</th>
                <th className="py-2 text-right text-circuit-muted font-mono uppercase">Khoản vay</th>
                <th className="py-2 text-right text-circuit-muted font-mono uppercase">Lãi suất</th>
              </>
            ) : (
              <>
                <th className="py-2 text-right text-circuit-muted font-mono uppercase">Phí (%)</th>
                <th className="py-2 text-right text-circuit-muted font-mono uppercase">Số tiền phí</th>
              </>
            )}
            <th className="py-2 text-right text-circuit-muted font-mono uppercase">Tổng cộng</th>
            <th className="py-2 text-right text-circuit-copperLight font-mono uppercase">Mỗi tháng</th>
          </tr>
        </thead>
        <tbody>
          {options.map((opt) => (
            <tr
              key={opt.months}
              onClick={() => onSelect(opt.months)}
              className={`border-b border-circuit-line/50 cursor-pointer transition-colors ${
                selectedMonths === opt.months
                  ? "bg-circuit-copper/10"
                  : "hover:bg-circuit-panel/60"
              }`}
            >
              <td className={`py-2 font-mono ${selectedMonths === opt.months ? "text-circuit-copperLight font-semibold" : "text-circuit-text"}`}>
                {opt.months} tháng
                {selectedMonths === opt.months && <span className="ml-1">✓</span>}
              </td>

              {isFinance ? (
                <>
                  <td className="py-2 text-right text-circuit-muted">
                    {opt.down_payment_amount != null ? formatVND(opt.down_payment_amount) : "—"}
                  </td>
                  <td className="py-2 text-right text-circuit-muted">
                    {opt.loan_amount != null ? formatVND(opt.loan_amount) : "—"}
                  </td>
                  <td className="py-2 text-right text-circuit-muted">
                    {opt.monthly_interest_rate != null ? `${opt.monthly_interest_rate.toFixed(2)}%/tháng` : "—"}
                  </td>
                </>
              ) : (
                <>
                  <td className="py-2 text-right text-circuit-muted">{opt.conversion_fee}%</td>
                  <td className="py-2 text-right text-circuit-muted">
                    {opt.fee_amount != null ? formatVND(opt.fee_amount) : "—"}
                  </td>
                </>
              )}

              <td className="py-2 text-right text-circuit-text font-medium">{formatVND(opt.total_amount)}</td>
              <td className="py-2 text-right font-bold text-circuit-copperLight">
                {formatVND(opt.monthly_payment ?? opt.monthly_amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface InstallmentBlockProps {
  amount: number;
}

export function CreditCardInstallment({ amount }: InstallmentBlockProps) {
  return (
    <div className="rounded-lg border border-circuit-copper/30 bg-circuit-panel/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard size={16} className="text-circuit-copper" />
        <div>
          <p className="text-sm font-medium text-circuit-copperLight">Thẻ tín dụng</p>
          <p className="text-xs text-circuit-muted">0% lãi suất · Có phí chuyển đổi trả góp</p>
        </div>
      </div>
      <CreditCardTable amount={amount} />
      <p className="text-[10px] text-circuit-muted mt-2">
        * Phí chuyển đổi trả góp do ngân hàng/phát hành thẻ tín dụng áp dụng.
      </p>
    </div>
  );
}

export function FinanceInstallment({ amount }: InstallmentBlockProps) {
  return (
    <div className="rounded-lg border border-circuit-line bg-circuit-panel/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Building2 size={16} className="text-circuit-copper" />
        <div>
          <p className="text-sm font-medium text-circuit-copperLight">Công ty tài chính</p>
          <p className="text-xs text-circuit-muted">Trả trước 20% · Lãi suất trên dư nợ giảm dần</p>
        </div>
      </div>
      <FinanceTable amount={amount} />
      <p className="text-[10px] text-circuit-muted mt-2">
        * Lãi suất 1.5%/tháng (18%/năm) trên dư nợ giảm dần. Phí xử lý do công ty tài chính quy định.
      </p>
    </div>
  );
}

function CreditCardTable({ amount }: { amount: number }) {
  const [options, setOptions] = useState<InstallmentOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getInstallmentOptions(amount, "credit_card")
      .then((res) => { if (!cancelled) setOptions(res.options); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
  }, [amount]);

  if (loading) return <div className="py-4 text-center text-sm text-circuit-muted"><Loader2 size={14} className="animate-spin inline mr-1" /> Đang tính...</div>;
  if (!options.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-circuit-line">
            <th className="py-1.5 text-left text-circuit-muted font-mono uppercase">Kỳ hạn</th>
            <th className="py-1.5 text-right text-circuit-muted font-mono uppercase">Phí (%)</th>
            <th className="py-1.5 text-right text-circuit-muted font-mono uppercase">Phí</th>
            <th className="py-1.5 text-right text-circuit-muted font-mono uppercase">Tổng</th>
            <th className="py-1.5 text-right text-circuit-copperLight font-mono uppercase">/tháng</th>
          </tr>
        </thead>
        <tbody>
          {options.map((opt) => (
            <tr key={opt.months} className="border-b border-circuit-line/50">
              <td className="py-1.5 font-mono text-circuit-text">{opt.months} tháng</td>
              <td className="py-1.5 text-right text-circuit-muted">{opt.conversion_fee}%</td>
              <td className="py-1.5 text-right text-circuit-muted">{opt.fee_amount != null ? formatVND(opt.fee_amount) : "—"}</td>
              <td className="py-1.5 text-right text-circuit-text">{formatVND(opt.total_amount)}</td>
              <td className="py-1.5 text-right font-semibold text-circuit-copperLight">{formatVND(opt.monthly_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FinanceTable({ amount }: { amount: number }) {
  const [options, setOptions] = useState<InstallmentOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getInstallmentOptions(amount, "finance")
      .then((res) => { if (!cancelled) setOptions(res.options); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
  }, [amount]);

  if (loading) return <div className="py-4 text-center text-sm text-circuit-muted"><Loader2 size={14} className="animate-spin inline mr-1" /> Đang tính...</div>;
  if (!options.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-circuit-line">
            <th className="py-1.5 text-left text-circuit-muted font-mono uppercase">Kỳ hạn</th>
            <th className="py-1.5 text-right text-circuit-muted font-mono uppercase">Trả trước</th>
            <th className="py-1.5 text-right text-circuit-muted font-mono uppercase">Vay</th>
            <th className="py-1.5 text-right text-circuit-muted font-mono uppercase">Lãi</th>
            <th className="py-1.5 text-right text-circuit-copperLight font-mono uppercase">/tháng</th>
          </tr>
        </thead>
        <tbody>
          {options.map((opt) => (
            <tr key={opt.months} className="border-b border-circuit-line/50">
              <td className="py-1.5 font-mono text-circuit-text">{opt.months} tháng</td>
              <td className="py-1.5 text-right text-circuit-muted">{opt.down_payment_amount != null ? formatVND(opt.down_payment_amount) : "—"}</td>
              <td className="py-1.5 text-right text-circuit-muted">{opt.loan_amount != null ? formatVND(opt.loan_amount) : "—"}</td>
              <td className="py-1.5 text-right text-circuit-muted">{opt.total_interest != null ? formatVND(opt.total_interest) : "—"}</td>
              <td className="py-1.5 text-right font-semibold text-circuit-copperLight">{formatVND(opt.monthly_payment ?? opt.monthly_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
