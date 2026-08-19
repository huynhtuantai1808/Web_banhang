"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Search, X, Truck, Send, Eye } from "lucide-react";
import { listAllOrders, getOrderInvoice, sendOrderInvoiceEmail, AdminOrderOut, InvoiceData } from "@/lib/services/adminOrders";
import { ApiError } from "@/lib/apiClient";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Chờ xác nhận", confirmed: "Đã xác nhận", shipping: "Đang giao",
  completed: "Hoàn thành", cancelled: "Đã huỷ",
};
const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABEL);

export default function AdminInvoicesPage() {
  const [orders, setOrders] = useState<AdminOrderOut[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<AdminOrderOut | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await listAllOrders({ keyword: keyword || undefined, status: statusFilter || undefined }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function openInvoice(order: AdminOrderOut) {
    setSelectedOrder(order);
    setInvoiceData(null);
    setEmailMessage(null);
    setInvoiceLoading(true);
    try {
      const data = await getOrderInvoice(order.id);
      setInvoiceData(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được hóa đơn");
    } finally {
      setInvoiceLoading(false);
    }
  }

  async function handleSendEmail() {
    if (!selectedOrder) return;
    setSendingEmail(true);
    setEmailMessage(null);
    try {
      const result = await sendOrderInvoiceEmail(selectedOrder.id);
      setEmailMessage(result.message);
    } catch (err) {
      setEmailMessage(err instanceof ApiError ? err.message : "Gửi email thất bại");
    } finally {
      setSendingEmail(false);
    }
  }

  function printInvoice() {
    window.print();
  }

  return (
    <main className="px-8 py-8 text-circuit-text">
      <header className="mb-6">
        <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest">Quản trị</p>
        <h1 className="font-display text-2xl mt-1 flex items-center gap-2">
          <FileText size={22} /> Quản lý Hóa đơn
        </h1>
      </header>

      {error && (
        <div className="mb-6 rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 rounded-full border border-circuit-line bg-circuit-panel px-4 py-2 max-w-xs">
          <Search size={16} className="text-circuit-muted" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
            placeholder="Tìm theo mã đơn, tên, SĐT..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-circuit-muted"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-circuit-line bg-circuit-panel px-3 py-2 text-sm text-circuit-text"
        >
          <option value="">Tất cả trạng thái</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-circuit-line overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-circuit-panel text-circuit-muted font-mono text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Mã đơn</th>
              <th className="text-left px-4 py-3">Khách hàng</th>
              <th className="text-right px-4 py-3">Tổng tiền</th>
              <th className="text-left px-4 py-3">Thanh toán</th>
              <th className="text-left px-4 py-3">Trạng thái</th>
              <th className="text-left px-4 py-3">Ngày đặt</th>
              <th className="text-center px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-circuit-muted">
                <Loader2 className="inline animate-spin mr-2" size={16} /> Đang tải...
              </td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-circuit-muted">Không có đơn hàng nào.</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-t border-circuit-line hover:bg-circuit-panel/60">
                  <td className="px-4 py-3 font-mono text-circuit-copperLight">{o.order_code}</td>
                  <td className="px-4 py-3">
                    <p>{o.customer_name}</p>
                    <p className="text-xs text-circuit-muted">{o.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatVND(o.final_amount)}</td>
                  <td className="px-4 py-3 text-circuit-muted text-xs">
                    {o.payment_status === "paid" ? "Đã TT" : o.payment_status === "failed" ? "Thất bại" : "Chờ TT"}
                    {" · "}{o.payment_gateway === "vnpay" ? "VNPay" : "COD"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-circuit-line text-circuit-muted">
                      {ORDER_STATUS_LABEL[o.status] || o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-circuit-muted text-xs">
                    {new Date(o.created_at).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openInvoice(o)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-circuit-line text-circuit-copperLight hover:border-circuit-copper hover:bg-circuit-copper/10 text-xs transition-colors mx-auto"
                    >
                      <Eye size={13} /> Xem
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-circuit-line bg-circuit-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-circuit-text">
                Hóa đơn — {selectedOrder.order_code}
              </h2>
              <button onClick={() => setSelectedOrder(null)} className="text-circuit-muted hover:text-circuit-text">
                <X size={20} />
              </button>
            </div>

            {invoiceLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin text-circuit-copper" size={24} />
              </div>
            ) : invoiceData ? (
              <>
                {/* Invoice printable content */}
                <div className="printable-invoice space-y-4">
                  <div className="flex items-start justify-between border-b border-circuit-line pb-4">
                    <div>
                      <p className="font-display text-xl text-circuit-copperLight">TechTrace</p>
                      <p className="text-sm text-circuit-muted mt-1">Điện thoại, Laptop, PC Gaming</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-circuit-muted">Ngày: {new Date(invoiceData.created_at).toLocaleDateString("vi-VN")}</p>
                      <p className="text-circuit-muted">Mã đơn: <span className="text-circuit-copperLight">{invoiceData.order_code}</span></p>
                    </div>
                  </div>

                  <div className="border-b border-circuit-line pb-4">
                    <p className="text-xs font-mono text-circuit-muted uppercase mb-1">Khách hàng</p>
                    <p className="text-sm font-medium">{invoiceData.customer_name}</p>
                    <p className="text-xs text-circuit-muted">{invoiceData.customer_phone}</p>
                    {invoiceData.customer_email && (
                      <p className="text-xs text-circuit-muted">{invoiceData.customer_email}</p>
                    )}
                    {invoiceData.shipping_address && (
                      <p className="text-xs text-circuit-muted mt-1">Địa chỉ: {invoiceData.shipping_address}</p>
                    )}
                  </div>

                  <div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-circuit-line">
                          <th className="text-left py-2 text-circuit-muted font-mono text-xs">Sản phẩm</th>
                          <th className="text-center py-2 text-circuit-muted font-mono text-xs">SL</th>
                          <th className="text-right py-2 text-circuit-muted font-mono text-xs">Đơn giá</th>
                          <th className="text-right py-2 text-circuit-muted font-mono text-xs">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceData.items.map((item, i) => (
                          <tr key={i} className="border-b border-circuit-line/50">
                            <td className="py-2">{item.product_name}</td>
                            <td className="py-2 text-center">{item.quantity}</td>
                            <td className="py-2 text-right font-mono">{formatVND(item.unit_price)}</td>
                            <td className="py-2 text-right font-mono">{formatVND(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-1 border-t border-circuit-line pt-3">
                    <div className="flex justify-between text-sm text-circuit-muted">
                      <span>Tạm tính</span>
                      <span className="font-mono">{formatVND(invoiceData.subtotal)}</span>
                    </div>
                    {invoiceData.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-circuit-signal">
                        <span>Giảm giá{invoiceData.promotion_code ? ` (${invoiceData.promotion_code})` : ""}</span>
                        <span className="font-mono">-{formatVND(invoiceData.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-display text-lg text-circuit-copperLight pt-2 border-t border-circuit-line">
                      <span>Tổng cộng</span>
                      <span>{formatVND(invoiceData.final_amount)}</span>
                    </div>
                  </div>

                  <div className="text-xs text-circuit-muted border-t border-circuit-line pt-3">
                    <p>Thanh toán: <span className="text-circuit-text">{invoiceData.payment_gateway === "vnpay" ? "VNPay" : "COD"}</span></p>
                    <p>Phương thức: <span className="text-circuit-text">{invoiceData.payment_method === "installment" ? "Trả góp" : "Thanh toán toàn bộ"}</span></p>
                  </div>
                </div>

                {/* Actions */}
                {emailMessage && (
                  <div className="mt-4 rounded-md border border-circuit-signal/30 bg-circuit-signal/10 px-3 py-2 text-sm text-circuit-signal">
                    {emailMessage}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={printInvoice}
                    className="flex items-center gap-2 px-4 py-2 rounded-md border border-circuit-line text-circuit-text hover:border-circuit-copper text-sm transition-colors"
                  >
                    <FileText size={14} /> In hóa đơn
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={sendingEmail}
                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-circuit-copper text-circuit-bg hover:bg-circuit-copperLight text-sm transition-colors disabled:opacity-50"
                  >
                    <Send size={14} />
                    {sendingEmail ? "Đang gửi..." : "Gửi email khách hàng"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .printable-invoice { color: #000 !important; }
          nav, button, a { display: none !important; }
        }
      `}</style>
    </main>
  );
}
