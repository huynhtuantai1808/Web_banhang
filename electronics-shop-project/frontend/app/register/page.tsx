"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { register } from "@/lib/services/auth";
import { ApiError } from "@/lib/apiClient";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register({
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || undefined,
        password: form.password,
        address: form.address || undefined,
      });
      router.push("/login?registered=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-circuit-bg px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg border border-circuit-line bg-circuit-panel p-8"
      >
        <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest mb-1">
          TechTrace
        </p>
        <h1 className="font-display text-2xl text-circuit-text mb-6 flex items-center gap-2">
          <UserPlus size={22} /> Đăng ký tài khoản
        </h1>

        {error && (
          <div className="mb-4 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Field label="Họ và tên *">
            <input
              required
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Số điện thoại *">
            <input
              required
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="input"
              placeholder="09xxxxxxxx"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Mật khẩu * (tối thiểu 6 ký tự)">
            <input
              required
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Địa chỉ">
            <input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 rounded-md bg-circuit-copper py-2.5 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50"
        >
          {loading ? "Đang đăng ký..." : "Đăng ký"}
        </button>

        <p className="mt-4 text-center text-sm text-circuit-muted">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-circuit-copperLight hover:underline">
            Đăng nhập
          </Link>
        </p>
      </form>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid #e2e5ea;
          background: #ffffff;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #1a1a2e;
          outline: none;
        }
        .input:focus {
          border-color: #c87f45;
        }
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
