"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Users, Loader2, PencilLine, UserX, ShieldCheck, User } from "lucide-react";
import {
  listEmployees, deactivateEmployee, EmployeeOut, isCurrentEmployeeAdmin,
} from "@/lib/services/employees";
import { ApiError } from "@/lib/apiClient";
import UserFormModal from "@/components/admin/UserFormModal";

export default function AdminUsersPage() {
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeOut | null>(null);

  const isAdmin = isCurrentEmployeeAdmin();

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listEmployees();
      setEmployees(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được danh sách nhân viên");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  async function handleDeactivate(id: string) {
    if (!confirm("Vô hiệu hoá tài khoản nhân viên này?")) return;
    try {
      await deactivateEmployee(id);
      await fetchEmployees();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Thao tác thất bại");
    }
  }

  if (!isAdmin) {
    return (
      <main className="px-8 py-8 text-circuit-text">
        <div className="rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          Chỉ tài khoản Quản lý (admin) mới xem được trang này.
        </div>
      </main>
    );
  }

  return (
    <main className="px-8 py-8 text-circuit-text">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest">Quản trị</p>
          <h1 className="font-display text-2xl mt-1 flex items-center gap-2">
            <Users size={22} /> Quản lý nhân viên
          </h1>
        </div>
        <button
          onClick={() => {
            setEditingEmployee(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-md bg-circuit-copper px-4 py-2 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors"
        >
          <Plus size={16} /> Thêm nhân viên
        </button>
      </header>

      {error && (
        <div className="mb-6 rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-circuit-line overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-circuit-panel text-circuit-muted font-mono text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Mã NV</th>
              <th className="text-left px-4 py-3">Họ tên</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Vai trò</th>
              <th className="text-left px-4 py-3">Quyền</th>
              <th className="text-left px-4 py-3">Trạng thái</th>
              <th className="text-right px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-circuit-muted">
                  <Loader2 className="inline animate-spin mr-2" size={16} /> Đang tải...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-circuit-muted">
                  Chưa có nhân viên nào.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="border-t border-circuit-line hover:bg-circuit-panel/60">
                  <td className="px-4 py-3 font-mono text-circuit-copperLight">{emp.employee_code}</td>
                  <td className="px-4 py-3">{emp.full_name}</td>
                  <td className="px-4 py-3 text-circuit-muted">{emp.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`flex items-center gap-1.5 w-fit px-2 py-1 rounded-full text-xs ${
                        emp.employee_role === "admin"
                          ? "bg-circuit-copper/15 text-circuit-copperLight"
                          : "bg-circuit-line text-circuit-muted"
                      }`}
                    >
                      {emp.employee_role === "admin" ? <ShieldCheck size={12} /> : <User size={12} />}
                      {emp.employee_role === "admin" ? "Quản lý" : "Nhân viên"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-circuit-muted">
                    {emp.employee_role === "admin"
                      ? "Full quyền"
                      : [
                          emp.permissions.can_create && "Thêm",
                          emp.permissions.can_edit && "Sửa",
                          emp.permissions.can_delete && "Xoá",
                        ]
                          .filter(Boolean)
                          .join(", ") || "Chỉ xem"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        emp.is_active
                          ? "bg-circuit-signal/15 text-circuit-signal"
                          : "bg-circuit-muted/15 text-circuit-muted"
                      }`}
                    >
                      {emp.is_active ? "Hoạt động" : "Đã khoá"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingEmployee(emp);
                          setModalOpen(true);
                        }}
                        className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight"
                      >
                        <PencilLine size={16} />
                      </button>
                      {emp.is_active && (
                        <button
                          onClick={() => handleDeactivate(emp.id)}
                          className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-red-400"
                        >
                          <UserX size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <UserFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchEmployees}
        editingEmployee={editingEmployee}
      />
    </main>
  );
}
