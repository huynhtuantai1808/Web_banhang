"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { assignPromotionToCustomer, PromotionOut } from "@/lib/services/promotions";
import { ApiError } from "@/lib/apiClient";

export default function AssignPromotionModal({
  open, onClose, promotion,
}: {
  open: boolean;
  onClose: () => void;
  promotion: PromotionOut | null;
}) {
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!promotion) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await assignPromotionToCustomer(promotion.id, phone);
      setMessage({ type: "success", text: res.message });
      setPhone("");
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Phân bổ thất bại" });
    } finally {
      setSaving(false);
    }
  }

  if (!open || !promotion) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-lg border border-circuit-line bg-circuit-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-circuit-text">Phân bổ mã "{promotion.code}"</h2>
          <button onClick={onClose} className="text-circuit-muted hover:text-circuit-text">
            <X size={20} />
          </button>
        </div>

        <p className="text-xs text-circuit-muted mb-4">
          Sau khi phân bổ cho ít nhất 1 khách hàng, mã này sẽ CHỈ dùng được bởi các khách hàng đã
          được phân bổ, không còn công khai cho mọi người nữa.
        </p>

        {message && (
          <div
            className={`mb-4 rounded-md border px-3 py-2 text-sm ${
              message.type === "success"
                ? "border-circuit-signal/30 bg-circuit-signal/10 text-circuit-signal"
                : "border-red-400/40 bg-red-400/10 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Số điện thoại khách hàng"
            className="flex-1 rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text outline-none focus:border-circuit-copper"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-circuit-copper px-4 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : "Phân bổ"}
          </button>
        </form>
      </div>
    </div>
  );
}
