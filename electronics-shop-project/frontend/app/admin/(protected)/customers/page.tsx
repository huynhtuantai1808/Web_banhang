"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Loader2, Search, Lock, Unlock, X } from "lucide-react";
import { listCustomers, getCustomer, updateCustomer, CustomerOut, CustomerDetailOut } from "@/lib/services/customers";
import { ApiError } from "@/lib/apiClient";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerOut[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetailOut | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCustomers = useCallback(async (kw?: string) => {
    setLoading(true);
    setError(null);
    try {
      setCustomers(await listCustomers(kw));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được danh sách khách hàng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  async function openDetail(id: string) {
    setDetailLoading(true);
    try {
      setDetail(await getCustomer(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được chi tiết khách hàng");
    } finally {
      setDetailLoading(false);
    }
  }

  async function toggleActive(customer: CustomerOut) {
    try {
      await updateCustomer(customer.id, { is_active: !customer.is_active });
      await fetchCustomers(keyword);
      if (detail?.id === customer.id) setDetail({ ...detail, is_active: !customer.is_active });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Thao tác thất bại");
    }
  }

  return (
    <main className="px-8 py-8 text-circuit-text">
      <header className="mb-6">
        <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest">Quản trị</p>
        <h1 className="font-display text-2xl mt-1 flex items-center gap-2">
          <Users size={22} /> Quản lý khách hàng
        </h1>
      </header>

      {error && (
        <div className="mb-6 rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-full border border-circuit-line bg-circuit-panel px-4 py-2 mb-6 max-w-sm">
        <Search size={16} className="text-circuit-muted" />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchCustomers(keyword)}
          placeholder="Tìm theo tên hoặc số điện thoại..."
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-circuit-muted"
        />
      </div>

      <div className="rounded-lg border border-circuit-line overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-circuit-panel text-circuit-muted font-mono text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Mã KH</th>
              <th className="text-left px-4 py-3">Họ tên</th>
              <th className="text-left px-4 py-3">SĐT</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Trạng thái</th>
              <th className="text-right px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-circuit-muted">
                  <Loader2 className="inline animate-spin mr-2" size={16} /> Đang tải...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-circuit-muted">
                  Chưa có khách hàng nào.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => openDetail(c.id)}
                  className="border-t border-circuit-line hover:bg-circuit-panel/60 cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-circuit-copperLight">{c.customer_code}</td>
                  <td className="px-4 py-3">{c.full_name}</td>
                  <td className="px-4 py-3 text-circuit-muted">{c.phone}</td>
                  <td className="px-4 py-3 text-circuit-muted">{c.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        c.is_active ? "bg-circuit-signal/15 text-circuit-signal" : "bg-red-400/15 text-red-300"
                      }`}
                    >
                      {c.is_active ? "Hoạt động" : "Đã khoá"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActive(c);
                      }}
                      className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight"
                    >
                      {c.is_active ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-lg border border-circuit-line bg-circuit-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-circuit-text">Chi tiết khách hàng</h2>
              <button onClick={() => setDetail(null)} className="text-circuit-muted hover:text-circuit-text">
                <X size={20} />
              </button>
            </div>

            {detailLoading || !detail ? (
              <div className="py-10 flex justify-center text-circuit-muted">
                <Loader2 className="animate-spin" size={20} />
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <Row label="Mã khách hàng" value={detail.customer_code} />
                <Row label="Họ tên" value={detail.full_name} />
                <Row label="Số điện thoại" value={detail.phone} />
                <Row label="Email" value={detail.email || "—"} />
                <Row label="Địa chỉ" value={detail.address || "—"} />
                <Row label="Ngày tạo" value={new Date(detail.created_at).toLocaleDateString("vi-VN")} />
                <div className="border-t border-circuit-line pt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-mono text-circuit-muted uppercase">Tổng đơn (đã TT)</p>
                    <p className="font-display text-lg text-circuit-text">{detail.total_orders}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-circuit-muted uppercase">Tổng chi tiêu</p>
                    <p className="font-display text-lg text-circuit-signal">{formatVND(detail.total_spent)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-circuit-muted">{label}</span>
      <span className="text-circuit-text">{value}</span>
    </div>
  );
}
