"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Phone, Mail } from "lucide-react";
import { loginStep1, verifyOtp } from "@/lib/services/auth";
import { ApiError } from "@/lib/apiClient";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";

  const [step, setStep] = useState<1 | 2>(1);
  const [loginBy, setLoginBy] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const credentials = loginBy === "phone"
        ? { phone, password }
        : { email, password };
      const res = await loginStep1(credentials);
      setOtpToken(res.otp_token);
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await verifyOtp(otpToken, otpCode);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Mã OTP không đúng hoặc đã hết hạn");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-circuit-bg px-4">
      <div className="w-full max-w-sm rounded-lg border-2 border-circuit-copper/40 bg-circuit-panel p-8 shadow-lg shadow-circuit-copper/10">
        <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest mb-1">
          TechTrace
        </p>
        <h1 className="font-display text-2xl text-circuit-text mb-6 flex items-center gap-2">
          <LogIn size={22} /> Đăng nhập
        </h1>

        {justRegistered && (
          <div className="mb-4 rounded-md border border-circuit-signal/30 bg-circuit-signal/10 px-3 py-2 text-sm text-circuit-signal">
            Đăng ký thành công! Hãy đăng nhập để tiếp tục.
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleStep1} className="space-y-4">
            {/* Toggle: Phone / Email */}
            <div className="flex rounded-md border border-circuit-line overflow-hidden">
              <button
                type="button"
                onClick={() => { setLoginBy("phone"); setEmail(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                  loginBy === "phone"
                    ? "bg-circuit-copper/15 text-circuit-copperLight border-b-2 border-circuit-copper"
                    : "text-circuit-muted hover:text-circuit-text"
                }`}
              >
                <Phone size={14} /> Số điện thoại
              </button>
              <button
                type="button"
                onClick={() => { setLoginBy("email"); setPhone(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                  loginBy === "email"
                    ? "bg-circuit-copper/15 text-circuit-copperLight border-b-2 border-circuit-copper"
                    : "text-circuit-muted hover:text-circuit-text"
                }`}
              >
                <Mail size={14} /> Email
              </button>
            </div>

            {loginBy === "phone" ? (
              <Field label="Số điện thoại">
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input"
                  placeholder="09xxxxxxxx"
                />
              </Field>
            ) : (
              <Field label="Địa chỉ email">
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="your@email.com"
                />
              </Field>
            )}

            <Field label="Mật khẩu">
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </Field>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-circuit-copper py-2.5 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Tiếp tục"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleStep2} className="space-y-4">
            <p className="text-sm text-circuit-muted">
              Mã OTP đã được gửi tới {loginBy === "phone" ? "số điện thoại" : "email"} của bạn.
              <br />
              <span className="text-xs">
                (Môi trường dev: mã OTP được in ra console log của backend)
              </span>
            </p>
            <Field label="Mã OTP">
              <input
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="input tracking-widest text-center text-lg"
                maxLength={6}
                placeholder="••••••"
              />
            </Field>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-circuit-copper py-2.5 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50"
            >
              {loading ? "Đang xác thực..." : "Xác nhận OTP"}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-sm text-circuit-muted hover:text-circuit-text"
            >
              ← Quay lại
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-circuit-muted">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="text-circuit-copperLight hover:underline">
            Đăng ký
          </Link>
        </p>
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
