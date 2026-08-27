"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getCustomer, updateCustomer, CustomerDetailOut, CustomerUpdateInput } from "@/lib/services/customers";
import { ApiError } from "@/lib/apiClient";
import { isCurrentEmployeeAdmin } from "@/lib/services/employees";

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isAdmin = isCurrentEmployeeAdmin();

  const [customer, setCustomer] = useState<CustomerDetailOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({ full_name: "", email: "", address: "", is_active: true });

  useEffect(() => {
    if (!id) return;
    getCustomer(id)
      .then((c) => {
        setCustomer(c);
        setForm({
          full_name: c.full_name,
          email: c.email ?? "",
          address: c.address ?? "",
          is_active: c.is_active,
        });
      })
      .catch(() => setError("Không tải được thông tin khách hàng"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) { setError("Vui lòng nhập họ tên"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload: CustomerUpdateInput = {
        full_name: form.full_name.trim(),
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
      };
      if (isAdmin) payload.is_active = form.is_active;
      await updateCustomer(id!, payload);
      setMsg("Đã lưu thay đổi");
      setTimeout(() => router.push("/admin/customers"), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <main className="px-8 py-8 text-circuit-text">
      <div className="flex items-center justify-center py-20 text-circuit-muted">
        <Loader2 className="animate-spin mr-2" size={20} /> Đang tải...
      </div>
    </main>
  );

  if (!customer) return (
    <main className="px-8 py-8 text-circuit-text">
      <p className="text-red-400">Không tìm thấy khách hàng.</p>
    </main>
  );

  return (
    <main className="px-8 py-8 text-circuit-text max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/customers" className="text-circuit-muted hover:text-circuit-copperLight transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-display text-xl">Sửa khách hàng</h1>
      </div>

      {msg && <div className="mb-4 rounded-md border border-circuit-line bg-circuit-panel text-circuit-signal px-4 py-3 text-sm">{msg}</div>}
      {error && <div className="mb-4 rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {/* Thông tin cơ bản */}
      <div className="rounded-xl border border-circuit-line bg-circuit-panel p-5 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm text-circuit-muted mb-4">
          <div><span className="font-mono text-xs uppercase">Mã KH</span><p className="text-circuit-text font-medium">{customer.customer_code}</p></div>
          <div><span className="font-mono text-xs uppercase">SĐT</span><p className="text-circuit-text font-medium">{customer.phone}</p></div>
          <div><span className="font-mono text-xs uppercase">Tổng đơn</span><p className="text-circuit-text font-medium">{customer.total_orders}</p></div>
          <div><span className="font-mono text-xs uppercase">Chi tiêu</span><p className="text-circuit-text font-medium">{customer.total_spent.toLocaleString("vi-VN")}đ</p></div>
          <div><span className="font-mono text-xs uppercase">Xác minh</span><p className={customer.is_verified ? "text-circuit-signal" : "text-red-400"}>{customer.is_verified ? "Đã xác minh" : "Chưa xác minh"}</p></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Họ tên *">
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input" required />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          </Field>
          <Field label="Địa chỉ">
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input min-h-[80px]" />
          </Field>
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm text-circuit-muted">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-circuit-copper" />
              Tài khoản đang kích hoạt
            </label>
          )}
          <button type="submit" disabled={saving}
            className="w-full rounded-md bg-circuit-copper py-2.5 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin" />}
            Lưu thay đổi
          </button>
        </form>
      </div>

      <style jsx global>{`
        .input { width: 100%; border-radius: 0.375rem; border: 1px solid #1e2c47; background: #0b1220; padding: 0.5rem 0.75rem; font-size: 0.875rem; color: #e7ecf5; outline: none; }
        .input:focus { border-color: #c87f45; }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-mono text-circuit-muted uppercase mb-1">{label}</span>
      {children}
    </label>
  );
}
