"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Loader2, Send, Calendar, TrendingUp, Package, Users, Mail, DollarSign } from "lucide-react";
import { getRevenueReport, sendRevenueEmail, RevenueReport } from "@/lib/services/reports";
import { ApiError } from "@/lib/apiClient";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

const PERIOD_TABS = [
  { key: "daily", label: "Hôm nay" },
  { key: "weekly", label: "Tuần này" },
  { key: "monthly", label: "Tháng này" },
];

export default function AdminReportsPage() {
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("monthly");
  const [customDate, setCustomDate] = useState<string>("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");

type ReportPeriod = "daily" | "weekly" | "monthly";

const fetchReport = useCallback(async () => {
  setLoading(true);
  setError(null);

  try {
    const filters: {
      period?: ReportPeriod;
      date?: string;
    } = {
      period: period as ReportPeriod,
      ...(customDate ? { date: customDate } : {}),
    };

    const data = await getRevenueReport(filters);
    setReport(data);
  } catch (err) {
    setError(
      err instanceof ApiError
        ? err.message
        : "Không tải được báo cáo"
    );
  } finally {
    setLoading(false);
  }
}, [period, customDate]);



  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  async function handleSendEmail() {
    if (!emailInput.trim()) return;
    setSendingEmail(true);
    setEmailMessage(null);
    try {
      const result = await sendRevenueEmail(emailInput, period, customDate || undefined);
      setEmailMessage(result.message);
    } catch (err) {
      setEmailMessage(err instanceof ApiError ? err.message : "Gửi email thất bại");
    } finally {
      setSendingEmail(false);
    }
  }

  // Calculate max revenue for chart
  const maxRevenue = report ? Math.max(...report.daily_revenue.map((d) => d.revenue), 1) : 1;

  return (
    <main className="px-8 py-8 text-circuit-text">
      <header className="mb-6">
        <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest">Quản trị</p>
        <h1 className="font-display text-2xl mt-1 flex items-center gap-2">
          <BarChart3 size={22} /> Báo cáo Doanh thu
        </h1>
      </header>

      {error && (
        <div className="mb-6 rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Period Filter */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex rounded-md border border-circuit-line overflow-hidden">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                period === tab.key
                  ? "bg-circuit-copper/15 text-circuit-copperLight border-b-2 border-circuit-copper"
                  : "text-circuit-muted hover:text-circuit-text"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-md border border-circuit-line bg-circuit-panel px-3 py-2">
          <Calendar size={14} className="text-circuit-muted" />
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="bg-transparent text-sm text-circuit-text outline-none"
          />
        </div>
        <button
          onClick={fetchReport}
          className="px-4 py-2 rounded-md border border-circuit-line text-circuit-text hover:border-circuit-copper text-sm transition-colors"
        >
          Làm mới
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-circuit-copper" size={32} />
        </div>
      ) : report ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="rounded-lg border border-circuit-copper/30 bg-circuit-panel p-5 shadow-md shadow-circuit-copper/10">
              <div className="flex items-center gap-2 text-xs font-mono text-circuit-copperLight uppercase mb-2">
                <DollarSign size={13} /> Tổng doanh thu
              </div>
              <p className="font-display text-2xl text-circuit-copperLight">
                {formatVND(report.total_revenue)}
              </p>
              <p className="text-xs text-circuit-muted mt-1">
                {report.from_date} → {report.to_date}
              </p>
            </div>
            <div className="rounded-lg border border-circuit-line bg-circuit-panel p-5">
              <div className="flex items-center gap-2 text-xs font-mono text-circuit-muted uppercase mb-2">
                <TrendingUp size={13} /> Số đơn hàng
              </div>
              <p className="font-display text-2xl text-circuit-text">{report.order_count.toLocaleString("vi-VN")}</p>
            </div>
            <div className="rounded-lg border border-circuit-line bg-circuit-panel p-5">
              <div className="flex items-center gap-2 text-xs font-mono text-circuit-muted uppercase mb-2">
                <Package size={13} /> Sản phẩm bán ra
              </div>
              <p className="font-display text-2xl text-circuit-text">
                {report.top_products.reduce((s, p) => s + p.quantity_sold, 0).toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="rounded-lg border border-circuit-line bg-circuit-panel p-5">
              <div className="flex items-center gap-2 text-xs font-mono text-circuit-muted uppercase mb-2">
                <Users size={13} /> Khách hàng
              </div>
              <p className="font-display text-2xl text-circuit-text">
                {report.top_customers.length.toLocaleString("vi-VN")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Revenue Chart */}
            <div className="lg:col-span-2 rounded-lg border border-circuit-line bg-circuit-panel p-5">
              <h3 className="font-mono text-xs text-circuit-copperLight uppercase mb-4">Doanh thu theo ngày</h3>
              {report.daily_revenue.length === 0 ? (
                <div className="text-center py-10 text-circuit-muted text-sm">Chưa có dữ liệu doanh thu trong kỳ này.</div>
              ) : (
                <div className="flex items-end gap-1 h-40">
                  {report.daily_revenue.map((d, i) => {
                    const heightPct = (d.revenue / maxRevenue) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t-sm bg-circuit-copper/70 hover:bg-circuit-copper transition-colors cursor-default min-h-[2px]"
                          style={{ height: `${Math.max(heightPct, 2)}%` }}
                          title={`${d.date}: ${formatVND(d.revenue)}`}
                        />
                        <span className="text-[9px] text-circuit-muted font-mono">
                          {d.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Send Email */}
            <div className="rounded-lg border border-circuit-line bg-circuit-panel p-5">
              <h3 className="font-mono text-xs text-circuit-copperLight uppercase mb-4 flex items-center gap-1.5">
                <Mail size={13} /> Gửi báo cáo qua email
              </h3>
              <div className="space-y-3">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Email nhận báo cáo..."
                  className="w-full rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text outline-none focus:border-circuit-copper"
                />
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail || !emailInput.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-circuit-copper py-2.5 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50"
                >
                  <Send size={14} />
                  {sendingEmail ? "Đang gửi..." : "Gửi báo cáo"}
                </button>
                {emailMessage && (
                  <p className="text-xs text-circuit-signal bg-circuit-signal/10 border border-circuit-signal/20 rounded px-3 py-2">
                    {emailMessage}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Top Products & Customers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Top Products */}
            <div className="rounded-lg border border-circuit-line bg-circuit-panel overflow-hidden">
              <div className="px-5 py-4 border-b border-circuit-line">
                <h3 className="font-mono text-xs text-circuit-copperLight uppercase">Top Sản phẩm bán chạy</h3>
              </div>
              {report.top_products.length === 0 ? (
                <div className="px-5 py-8 text-center text-circuit-muted text-sm">Chưa có dữ liệu.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-circuit-bg/50">
                    <tr>
                      <th className="text-left px-5 py-2 text-circuit-muted font-mono text-xs">#</th>
                      <th className="text-left px-5 py-2 text-circuit-muted font-mono text-xs">Sản phẩm</th>
                      <th className="text-right px-5 py-2 text-circuit-muted font-mono text-xs">Đã bán</th>
                      <th className="text-right px-5 py-2 text-circuit-muted font-mono text-xs">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.top_products.map((p, i) => (
                      <tr key={i} className="border-t border-circuit-line/50">
                        <td className="px-5 py-2 text-circuit-muted font-mono text-xs">{i + 1}</td>
                        <td className="px-5 py-2 text-circuit-text">{p.name}</td>
                        <td className="px-5 py-2 text-right font-mono text-circuit-copperLight">{p.quantity_sold}</td>
                        <td className="px-5 py-2 text-right font-mono text-circuit-signal">{formatVND(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Top Customers */}
            <div className="rounded-lg border border-circuit-line bg-circuit-panel overflow-hidden">
              <div className="px-5 py-4 border-b border-circuit-line">
                <h3 className="font-mono text-xs text-circuit-copperLight uppercase">Top Khách hàng</h3>
              </div>
              {report.top_customers.length === 0 ? (
                <div className="px-5 py-8 text-center text-circuit-muted text-sm">Chưa có dữ liệu.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-circuit-bg/50">
                    <tr>
                      <th className="text-left px-5 py-2 text-circuit-muted font-mono text-xs">#</th>
                      <th className="text-left px-5 py-2 text-circuit-muted font-mono text-xs">Khách hàng</th>
                      <th className="text-right px-5 py-2 text-circuit-muted font-mono text-xs">Đơn hàng</th>
                      <th className="text-right px-5 py-2 text-circuit-muted font-mono text-xs">Tổng chi tiêu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.top_customers.map((c, i) => (
                      <tr key={i} className="border-t border-circuit-line/50">
                        <td className="px-5 py-2 text-circuit-muted font-mono text-xs">{i + 1}</td>
                        <td className="px-5 py-2 text-circuit-text">{c.name}</td>
                        <td className="px-5 py-2 text-right font-mono text-circuit-copperLight">{c.order_count}</td>
                        <td className="px-5 py-2 text-right font-mono text-circuit-signal">{formatVND(c.total_spend)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
