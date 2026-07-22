"use client";

import { useEffect, useState } from "react";
import { X, Loader2, ShieldCheck, User } from "lucide-react";
import {
  createEmployee, updateEmployee, EmployeeOut, EmployeeCreateInput, PermissionSet,
} from "@/lib/services/employees";
import { ApiError } from "@/lib/apiClient";

const EMPTY_PERMISSIONS: PermissionSet = { can_create: false, can_edit: false, can_delete: false };

export default function UserFormModal({
  open,
  onClose,
  onSaved,
  editingEmployee,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingEmployee?: EmployeeOut | null;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [permissions, setPermissions] = useState<PermissionSet>(EMPTY_PERMISSIONS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingEmployee;

  useEffect(() => {
    if (!open) return;
    if (editingEmployee) {
      setFullName(editingEmployee.full_name);
      setPhone(editingEmployee.phone);
      setEmail(editingEmployee.email);
      setPassword("");
      setRole(editingEmployee.employee_role);
      setPermissions(editingEmployee.permissions);
    } else {
      setFullName("");
      setPhone("");
      setEmail("");
      setPassword("");
      setRole("staff");
      setPermissions(EMPTY_PERMISSIONS);
    }
    setError(null);
  }, [open, editingEmployee]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEditing && editingEmployee) {
        await updateEmployee(editingEmployee.id, {
          full_name: fullName,
          phone,
          email,
          password: password || undefined,
          employee_role: role,
          permissions,
        });
      } else {
        const payload: EmployeeCreateInput = {
          full_name: fullName,
          phone,
          email,
          password,
          employee_role: role,
          permissions,
        };
        await createEmployee(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu tài khoản nhân viên thất bại");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-lg border border-circuit-line bg-circuit-panel p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg text-circuit-text">
            {isEditing ? "Sửa tài khoản nhân viên" : "Thêm nhân viên (Add User)"}
          </h2>
          <button onClick={onClose} className="text-circuit-muted hover:text-circuit-text">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Họ và tên *">
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số điện thoại *">
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
            </Field>
            <Field label="Email *">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </Field>
          </div>
          <Field label={isEditing ? "Mật khẩu (để trống nếu không đổi)" : "Mật khẩu *"}>
            <input
              required={!isEditing}
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </Field>

          {/* Thanh chọn vai trò — chữ ký của tính năng phân quyền được yêu cầu */}
          <div>
            <span className="block text-xs font-mono text-circuit-muted uppercase mb-2">
              Vai trò / Phân quyền
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors ${
                  role === "admin"
                    ? "border-circuit-copper bg-circuit-copper/15 text-circuit-copperLight"
                    : "border-circuit-line text-circuit-muted hover:border-circuit-copper"
                }`}
              >
                <ShieldCheck size={16} /> Quản lý (Full quyền)
              </button>
              <button
                type="button"
                onClick={() => setRole("staff")}
                className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors ${
                  role === "staff"
                    ? "border-circuit-copper bg-circuit-copper/15 text-circuit-copperLight"
                    : "border-circuit-line text-circuit-muted hover:border-circuit-copper"
                }`}
              >
                <User size={16} /> Nhân viên
              </button>
            </div>
          </div>

          {role === "admin" ? (
            <p className="text-xs text-circuit-muted bg-circuit-bg/60 rounded-md px-3 py-2">
              Quản lý có toàn quyền: tạo/sửa/xoá sản phẩm, quản lý tài khoản nhân viên khác,
              không phụ thuộc các quyền bên dưới.
            </p>
          ) : (
            <div>
              <span className="block text-xs font-mono text-circuit-muted uppercase mb-2">
                Quyền chi tiết cho Nhân viên
              </span>
              <div className="space-y-2">
                <PermissionCheckbox
                  label="Thêm sản phẩm / nhập kho"
                  checked={permissions.can_create}
                  onChange={(v) => setPermissions((p) => ({ ...p, can_create: v }))}
                />
                <PermissionCheckbox
                  label="Sửa sản phẩm / tải ảnh"
                  checked={permissions.can_edit}
                  onChange={(v) => setPermissions((p) => ({ ...p, can_edit: v }))}
                />
                <PermissionCheckbox
                  label="Xoá / ngừng bán sản phẩm"
                  checked={permissions.can_delete}
                  onChange={(v) => setPermissions((p) => ({ ...p, can_delete: v }))}
                />
              </div>
              <p className="text-xs text-circuit-muted mt-2">
                Truy xuất dữ liệu (xem danh sách/tìm kiếm) luôn được phép với mọi nhân viên đã đăng nhập.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-circuit-copper py-2.5 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {isEditing ? "Lưu thay đổi" : "Tạo tài khoản"}
          </button>
        </form>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid #1e2c47;
          background: #0b1220;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #e7ecf5;
          outline: none;
        }
        .input:focus {
          border-color: #c87f45;
        }
      `}</style>
    </div>
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

function PermissionCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-circuit-text cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-circuit-copper"
      />
      {label}
    </label>
  );
}
