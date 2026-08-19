"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import {
  createPromotion, updatePromotion, PromotionOut, PromotionCreateInput,
} from "@/lib/services/promotions";
import { ApiError } from "@/lib/apiClient";

const EMPTY: PromotionCreateInput = {
  code: "", name: "", description: "", discount_type: "percent", discount_value: 10,
};

export default function PromotionFormModal({
  open, onClose, onSaved, editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: PromotionOut | null;
}) {
  const [form, setForm] = useState<PromotionCreateInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!editing;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        code: editing.code,
        name: editing.name,
        description: editing.description ?? "",
        discount_type: editing.discount_type,
        discount_value: editing.discount_value,
        max_usage: editing.max_usage ?? undefined,
      });
    } else {
      setForm(EMPTY);
    }
    setError(null);
  }, [open, editing]);

  function update<K extends keyof PromotionCreateInput>(key: K, value: PromotionCreateInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEditing && editing) {
        await updatePromotion(editing.id, {
          name: form.name,
          description: form.description,
          discount_type: form.discount_type,
          discount_value: form.discount_value,
          max_usage: form.max_usage,
        });
      } else {
        await createPromotion(form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu mã khuyến mãi thất bại");
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
            {isEditing ? "Sửa mã khuyến mãi" : "Tạo mã khuyến mãi"}
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
          <Field label="Mã khuyến mãi *">
            <input
              required
              disabled={isEditing}
              value={form.code}
              onChange={(e) => update("code", e.target.value.toUpperCase())}
              className="input"
              placeholder="SUMMER10"
            />
          </Field>
          <Field label="Tên chương trình *">
            <input required value={form.name} onChange={(e) => update("name", e.target.value)} className="input" />
          </Field>
          <Field label="Mô tả">
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="input min-h-[60px]"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Loại giảm giá">
              <select
                value={form.discount_type}
                onChange={(e) => update("discount_type", e.target.value as "percent" | "amount")}
                className="input"
              >
                <option value="percent">Theo % </option>
                <option value="amount">Số tiền cố định</option>
              </select>
            </Field>
            <Field label={form.discount_type === "percent" ? "Giá trị (%)" : "Giá trị (VNĐ)"}>
              <input
                required
                type="number"
                min={0}
                value={form.discount_value}
                onChange={(e) => update("discount_value", Number(e.target.value))}
                className="input"
              />
            </Field>
          </div>
          <Field label="Giới hạn lượt dùng (để trống = không giới hạn)">
            <input
              type="number"
              min={1}
              value={form.max_usage ?? ""}
              onChange={(e) => update("max_usage", e.target.value ? Number(e.target.value) : undefined)}
              className="input"
            />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-circuit-copper py-2.5 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {isEditing ? "Lưu thay đổi" : "Tạo mã"}
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
