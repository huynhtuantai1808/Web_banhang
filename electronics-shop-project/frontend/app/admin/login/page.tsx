"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { employeeLogin } from "@/lib/services/employees";
import { ApiError } from "@/lib/apiClient";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await employeeLogin(email, password);
      router.push("/admin/products");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-circuit-bg px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-circuit-line bg-circuit-panel p-8"
      >
        <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest mb-1">
          Quản trị
        </p>
        <h1 className="font-display text-2xl text-circuit-text mb-6">Đăng nhập nhân viên</h1>

        {error && (
          <div className="mb-4 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <label className="block text-xs font-mono text-circuit-muted uppercase mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text outline-none focus:border-circuit-copper"
        />

        <label className="block text-xs font-mono text-circuit-muted uppercase mb-1">Mật khẩu</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text outline-none focus:border-circuit-copper"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-circuit-copper py-2.5 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </main>
  );
}
