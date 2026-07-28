"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { createDiscountRule, updateDiscountRule, DiscountRuleOut, DiscountRuleInput } from "@/lib/services/discountRules";
import { listBrands, listCategories, CatalogOption } from "@/lib/services/products";
import { ApiError } from "@/lib/apiClient";

export default function DiscountRuleFormModal({
  open, onClose, onSaved, editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: DiscountRuleOut | null;
}) {
  const [brands, setBrands] = useState<CatalogOption[]>([]);
  const [categories, setCategories] = useState<CatalogOption[]>([]);
  const [brandId, setBrandId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [minQuantity, setMinQuantity] = useState(2);
  const [discountPercent, setDiscountPercent] = useState(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!editing;

  useEffect(() => {
    if (!open) return;
    Promise.all([listBrands(), listCategories()]).then(([b, c]) => {
      setBrands(b);
      setCategories(c);
    });
    if (editing) {
      setBrandId(editing.brand_id?.toString() ?? "");
      setCategoryId(editing.category_id?.toString() ?? "");
      setMinQuantity(editing.min_quantity);
      setDiscountPercent(editing.discount_percent);
    } else {
      setBrandId("");
      setCategoryId("");
      setMinQuantity(2);
      setDiscountPercent(5);
    }
    setError(null);
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brandId && !categoryId) {
      setError("Phải chọn ít nhất 1 trong 2: Hãng hoặc Danh mục.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: DiscountRuleInput = {
        brand_id: brandId ? Number(brandId) : undefined,
        category_id: categoryId ? Number(categoryId) : undefined,
        min_quantity: minQuantity,
        discount_percent: discountPercent,
      };
      if (isEditing && editing) {
        await updateDiscountRule(editing.id, payload);
      } else {
        await createDiscountRule(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu thất bại");
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
            {isEditing ? "Sửa quy tắc chiết khấu" : "Tạo quy tắc chiết khấu tự động"}
          </h2>
          <button onClick={onClose} className="text-circuit-muted hover:text-circuit-text">
            <X size={20} />
          </button>
        </div>

        <p className="text-xs text-circuit-muted mb-4">
          Chiết khấu này áp dụng TỰ ĐỘNG khi khách mua đủ số lượng — không cần nhập mã (khác với
          Khuyến mãi ở trên).
        </p>

        {error && (
          <div className="mb-4 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-mono text-circuit-muted uppercase mb-1">Hãng</span>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="input"
              >
                <option value="">— Không giới hạn —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-mono text-circuit-muted uppercase mb-1">Danh mục</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="input"
              >
                <option value="">— Không giới hạn —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-mono text-circuit-muted uppercase mb-1">
                Số lượng tối thiểu
              </span>
              <input
                type="number"
                min={1}
                value={minQuantity}
                onChange={(e) => setMinQuantity(Number(e.target.value))}
                className="input"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-mono text-circuit-muted uppercase mb-1">
                Giảm giá (%)
              </span>
              <input
                type="number"
                min={1}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="input"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-circuit-copper py-2.5 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {isEditing ? "Lưu thay đổi" : "Tạo quy tắc"}
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
