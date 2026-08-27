"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  EmployeeOut, EmployeeUpdateInput, listEmployees, updateEmployee,
} from "@/lib/services/employees";
import { ApiError } from "@/lib/apiClient";

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [employee, setEmployee] = useState<EmployeeOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    employee_role: "staff" as "admin" | "staff",
    can_create: false,
    can_edit: false,
    can_delete: false,
    is_active: true,
  });

  useEffect(() => {
    if (!id) return;
    listEmployees()
      .then((list) => list.find((e) => e.id === id))
      .then((e) => {
        if (!e) { setError("Không tìm thấy nhân viên"); return; }
        setEmployee(e);
        setForm({
          full_name: e.full_name,
          phone: e.phone,
          email: e.email,
          password: "",
          employee_role: e.employee_role,
          can_create: e.permissions.can_create,
          can_edit: e.permissions.can_edit,
          can_delete: e.permissions.can_delete,
          is_active: e.is_active,
        });
      })
      .catch(() => setError("Không tải được danh sách nhân viên"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) { setError("Vui lòng nhập họ tên"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload: EmployeeUpdateInput = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        employee_role: form.employee_role,
        permissions: { can_create: form.can_create, can_edit: form.can_edit, can_delete: form.can_delete },
        is_active: form.is_active,
      };
      if (form.password.trim()) payload.password = form.password.trim();
      await updateEmployee(id!, payload);
      setMsg("Đã lưu thay đổi");
      setTimeout(() => router.push("/admin/users"), 1500);
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

  if (!employee) return (
    <main className="px-8 py-8 text-circuit-text">
      <p className="text-red-400">Không tìm thấy nhân viên.</p>
    </main>
  );

  return (
    <main className="px-8 py-8 text-circuit-text max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/users" className="text-circuit-muted hover:text-circuit-copperLight transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-display text-xl">Sửa nhân viên</h1>
      </div>

      {msg && <div className="mb-4 rounded-md border border-circuit-line bg-circuit-panel text-circuit-signal px-4 py-3 text-sm">{msg}</div>}
      {error && <div className="mb-4 rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="rounded-xl border border-circuit-line bg-circuit-panel p-5 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm text-circuit-muted mb-5">
          <div><span className="font-mono text-xs uppercase">Mã NV</span><p className="text-circuit-text font-medium">{employee.employee_code}</p></div>
          <div><span className="font-mono text-xs uppercase">SĐT</span><p className="text-circuit-text font-medium">{employee.phone}</p></div>
          <div><span className="font-mono text-xs uppercase">Vai trò</span><p className="text-circuit-text font-medium">{employee.employee_role === "admin" ? "Quản trị viên" : "Nhân viên"}</p></div>
          <div><span className="font-mono text-xs uppercase">Trạng thái</span><p className={employee.is_active ? "text-circuit-signal" : "text-red-400"}>{employee.is_active ? "Đang hoạt động" : "Đã khóa"}</p></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Họ tên *">
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input" required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SĐT">
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
            </Field>
          </div>
          <Field label="Mật khẩu mới">
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input"
              placeholder="Bỏ trống nếu không đổi" />
          </Field>

          {/* Vai trò */}
          <Field label="Vai trò">
            <div className="flex gap-2">
              {(["admin", "staff"] as const).map((role) => (
                <button key={role} type="button"
                  onClick={() => setForm({ ...form, employee_role: role })}
                  className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${
                    form.employee_role === role
                      ? "border-circuit-copper bg-circuit-copper/15 text-circuit-copperLight"
                      : "border-circuit-line text-circuit-muted hover:border-circuit-copper/50"
                  }`}>
                  {role === "admin" ? "Quản trị viên" : "Nhân viên"}
                </button>
              ))}
            </div>
          </Field>

          {/* Quyền — chỉ hiện khi là staff */}
          {form.employee_role === "staff" && (
            <Field label="Quyền hạn">
              <div className="space-y-2">
                {(["can_create", "can_edit", "can_delete"] as const).map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-sm text-circuit-muted cursor-pointer">
                    <input type="checkbox" checked={form[perm]} onChange={(e) => setForm({ ...form, [perm]: e.target.checked })}
                      className="accent-circuit-copper" />
                    {perm === "can_create" ? "Tạo / Nhập sản phẩm" :
                     perm === "can_edit" ? "Sửa sản phẩm / Upload ảnh" :
                     "Ngừng bán / Xóa / Khóa"}
                  </label>
                ))}
              </div>
            </Field>
          )}

          <label className="flex items-center gap-2 text-sm text-circuit-muted">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="accent-circuit-copper" />
            Tài khoản đang hoạt động
          </label>

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
