"use client";

import { useEffect, useState } from "react";
import { CreditCard, Building2, Loader2 } from "lucide-react";
import {
  InstallmentOption, InstallmentType, getInstallmentOptions, getInstallmentInfo,
  InstallmentInfo, calculateInstallmentOptionsLocal,
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
  const [info, setInfo] = useState<InstallmentInfo | null>(null);

  useEffect(() => {
    getInstallmentInfo().then(setInfo).catch(console.error);
  }, []);

  useEffect(() => {
    if (!info) return;
    setOptions(calculateInstallmentOptionsLocal(amount, selectedType, info));
  }, [amount, selectedType, info]);

  if (!info) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin text-circuit-muted mr-2" />
        <span className="text-sm text-circuit-muted">Đang tải cấu hình...</span>
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
            <th className="py-2 text-right text-circuit-muted font-mono uppercase">Trả trước ({(selectedType === "finance" ? (options[0]?.down_payment_pct ?? 20) : (options[0]?.down_payment_pct ?? 0)).toFixed(0)}%)</th>
            {isFinance ? (
              <>
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

              <td className="py-2 text-right text-circuit-muted">
                {opt.down_payment_amount != null && opt.down_payment_amount > 0 ? formatVND(opt.down_payment_amount) : (opt.down_payment_amount === 0 ? "0₫" : "—")}
              </td>
              {isFinance ? (
                <>
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
  const [downPaymentPct, setDownPaymentPct] = useState(0.0);
  const [info, setInfo] = useState<InstallmentInfo | null>(null);

  useEffect(() => {
    getInstallmentInfo().then(setInfo).catch(console.error);
  }, []);
  
  return (
    <div className="rounded-lg border border-circuit-copper/30 bg-circuit-panel/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard size={16} className="text-circuit-copper" />
        <div className="flex-1 flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-circuit-copperLight">Thẻ tín dụng</p>
            <p className="text-xs text-circuit-muted">0% lãi suất · Có phí chuyển đổi trả góp</p>
          </div>
          <select 
            value={downPaymentPct}
            onChange={(e) => setDownPaymentPct(Number(e.target.value))}
            className="rounded border border-circuit-line/60 bg-circuit-bg/50 px-2 py-1 text-xs text-circuit-text outline-none focus:border-circuit-copper"
          >
            <option value={0.0}>Trả trước 0%</option>
            <option value={0.1}>Trả trước 10%</option>
            <option value={0.2}>Trả trước 20%</option>
            <option value={0.3}>Trả trước 30%</option>
            <option value={0.4}>Trả trước 40%</option>
            <option value={0.5}>Trả trước 50%</option>
            <option value={0.6}>Trả trước 60%</option>
            <option value={0.7}>Trả trước 70%</option>
          </select>
        </div>
      </div>
      <CreditCardTable amount={amount} downPaymentPct={downPaymentPct} info={info} />
      <p className="text-[10px] text-circuit-muted mt-2">
        * Phí chuyển đổi trả góp do ngân hàng/phát hành thẻ tín dụng áp dụng.
      </p>
    </div>
  );
}

export function FinanceInstallment({ amount }: InstallmentBlockProps) {
  const [downPaymentPct, setDownPaymentPct] = useState(0.2);
  const [info, setInfo] = useState<InstallmentInfo | null>(null);

  useEffect(() => {
    getInstallmentInfo().then(setInfo).catch(console.error);
  }, []);
  
  return (
    <div className="rounded-lg border border-circuit-line bg-circuit-panel/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Building2 size={16} className="text-circuit-copper" />
        <div className="flex-1 flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-circuit-copperLight">Mua Trả góp</p>
            <p className="text-xs text-circuit-muted">Lãi suất trên dư nợ giảm dần</p>
          </div>
          <select 
            value={downPaymentPct}
            onChange={(e) => setDownPaymentPct(Number(e.target.value))}
            className="rounded border border-circuit-line/60 bg-circuit-bg/50 px-2 py-1 text-xs text-circuit-text outline-none focus:border-circuit-copper"
          >
            <option value={0.2}>Trả trước 20%</option>
            <option value={0.3}>Trả trước 30%</option>
            <option value={0.4}>Trả trước 40%</option>
            <option value={0.5}>Trả trước 50%</option>
            <option value={0.6}>Trả trước 60%</option>
            <option value={0.7}>Trả trước 70%</option>
          </select>
        </div>
      </div>
      <FinanceTable amount={amount} downPaymentPct={downPaymentPct} info={info} />
      <p className="text-[10px] text-circuit-muted mt-2">
        * Lãi suất 1.5%/tháng (18%/năm) trên dư nợ giảm dần. Phí xử lý do công ty cho vay trả góp quy định.
      </p>
    </div>
  );
}

function CreditCardTable({ amount, downPaymentPct = 0.0, info }: { amount: number, downPaymentPct?: number, info: InstallmentInfo | null }) {
  const [options, setOptions] = useState<InstallmentOption[]>([]);

  useEffect(() => {
    if (!info) return;
    setOptions(calculateInstallmentOptionsLocal(amount, "credit_card", info, downPaymentPct));
  }, [amount, downPaymentPct, info]);

  if (!info) return <div className="py-4 text-center text-sm text-circuit-muted"><Loader2 size={14} className="animate-spin inline mr-1" /> Đang tính...</div>;
  if (!options.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-circuit-line">
            <th className="py-1.5 text-left text-circuit-muted font-mono uppercase">Kỳ hạn</th>
            <th className="py-1.5 text-right text-circuit-muted font-mono uppercase">Trả trước ({(downPaymentPct * 100).toFixed(0)}%)</th>
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
              <td className="py-1.5 text-right text-circuit-muted">{opt.down_payment_amount != null && opt.down_payment_amount > 0 ? formatVND(opt.down_payment_amount) : "0₫"}</td>
              <td className="py-1.5 text-right text-circuit-muted">{opt.conversion_fee}%</td>
              <td className="py-1.5 text-right text-circuit-muted">{opt.fee_amount != null ? formatVND(opt.fee_amount) : "—"}</td>
              <td className="py-1.5 text-right text-circuit-text">{formatVND(opt.total_amount)}</td>
              <td className="py-1.5 text-right font-semibold text-circuit-copperLight">{formatVND(opt.monthly_payment ?? opt.monthly_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FinanceTable({ amount, downPaymentPct = 0.2, info }: { amount: number, downPaymentPct?: number, info: InstallmentInfo | null }) {
  const [options, setOptions] = useState<InstallmentOption[]>([]);

  useEffect(() => {
    if (!info) return;
    setOptions(calculateInstallmentOptionsLocal(amount, "finance", info, downPaymentPct));
  }, [amount, downPaymentPct, info]);

  if (!info) return <div className="py-4 text-center text-sm text-circuit-muted"><Loader2 size={14} className="animate-spin inline mr-1" /> Đang tính...</div>;
  if (!options.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-circuit-line">
            <th className="py-1.5 text-left text-circuit-muted font-mono uppercase">Kỳ hạn</th>
            <th className="py-1.5 text-right text-circuit-muted font-mono uppercase">Trả trước ({(downPaymentPct * 100).toFixed(0)}%)</th>
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
