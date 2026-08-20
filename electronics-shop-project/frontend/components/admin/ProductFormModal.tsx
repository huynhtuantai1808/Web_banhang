"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { createProduct, updateProduct, ProductOut, ProductInput, listBrands, listCategories, CatalogOption, CategoryOption } from "@/lib/services/products";
import { ApiError } from "@/lib/apiClient";

const EMPTY_FORM: ProductInput = {
  product_code: "",
  name: "",
  description: "",
  brand: "",
  brand_id: undefined,
  category: "",
  category_id: undefined,
  color: "",
  material: "",
  size_dimension: "",
  price: 0,
  discount_price: undefined,
  is_installment_eligible: true,
};

export default function ProductFormModal({
  open,
  onClose,
  onSaved,
  editingProduct,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingProduct?: ProductOut | null;
}) {
  const [form, setForm] = useState<ProductInput>(EMPTY_FORM);
  const [brands, setBrands] = useState<CatalogOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingProduct;

  // Load brand & category lists when modal opens
  useEffect(() => {
    if (!open) return;
    setLoadingOptions(true);
    Promise.all([listBrands(), listCategories()])
      .then(([b, c]) => {
        setBrands(b);
        setCategories(c);
      })
      .catch(() => {})
      .finally(() => setLoadingOptions(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (editingProduct) {
      setForm({
        product_code: editingProduct.product_code,
        name: editingProduct.name,
        description: editingProduct.description ?? "",
        brand: editingProduct.brand ?? "",
        brand_id: undefined,
        category: editingProduct.category ?? "",
        category_id: undefined,
        color: editingProduct.color ?? "",
        material: editingProduct.material ?? "",
        size_dimension: editingProduct.size_dimension ?? "",
        price: editingProduct.price,
        discount_price: editingProduct.discount_price ?? undefined,
        is_installment_eligible: editingProduct.is_installment_eligible,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
  }, [open, editingProduct]);

  function update<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // When user picks a brand from dropdown, store its ID and name
  function selectBrand(id: number) {
    const found = brands.find((b) => b.id === id);
    setForm((prev) => ({ ...prev, brand_id: id, brand: found?.name ?? "" }));
  }

  // When user picks a category from dropdown, store its ID and name
  function selectCategory(id: number) {
    const found = categories.find((c) => c.id === id);
    setForm((prev) => ({ ...prev, category_id: id, category: found?.name ?? "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.product_code.trim() || !form.name.trim() || !form.price) {
      setError("Vui lòng nhập đủ Mã sản phẩm, Tên sản phẩm và Giá.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isEditing && editingProduct) {
        await updateProduct(editingProduct.id, form);
      } else {
        await createProduct(form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu sản phẩm thất bại");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-circuit-line bg-circuit-panel p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg text-circuit-text">
            {isEditing ? "Sửa sản phẩm" : "Nhập sản phẩm mới"}
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mã sản phẩm *">
              <input
                required
                disabled={isEditing}
                value={form.product_code}
                onChange={(e) => update("product_code", e.target.value)}
                className="input"
                placeholder="SP000123"
              />
            </Field>
            <Field label="Tên sản phẩm *">
              <input
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="input"
                placeholder="iPhone 16 Pro Max 256GB"
              />
            </Field>
          </div>

          <Field label="Mô tả">
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="input min-h-[70px]"
              placeholder="Mô tả ngắn về sản phẩm..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Hãng *">
              {loadingOptions ? (
                <div className="input flex items-center gap-2 text-circuit-muted text-sm">
                  <Loader2 size={14} className="animate-spin" /> Đang tải...
                </div>
              ) : (
                <select
                  value={form.brand_id ?? ""}
                  onChange={(e) => selectBrand(Number(e.target.value))}
                  className="input"
                >
                  <option value="">— Chọn hãng —</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Danh mục *">
              {loadingOptions ? (
                <div className="input flex items-center gap-2 text-circuit-muted text-sm">
                  <Loader2 size={14} className="animate-spin" /> Đang tải...
                </div>
              ) : (
                <select
                  value={form.category_id ?? ""}
                  onChange={(e) => selectCategory(Number(e.target.value))}
                  className="input"
                >
                  <option value="">— Chọn danh mục —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parent_id ? `    ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Màu/chất liệu">
              <input
                value={form.color}
                onChange={(e) => update("color", e.target.value)}
                className="input"
                placeholder="Đen, Titan..."
              />
            </Field>
            <Field label="Chất liệu">
              <input
                value={form.material}
                onChange={(e) => update("material", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Kích thước">
              <input
                value={form.size_dimension}
                onChange={(e) => update("size_dimension", e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Giá bán *">
              <input
                required
                type="number"
                min={0}
                value={form.price || ""}
                onChange={(e) => update("price", Number(e.target.value))}
                className="input"
              />
            </Field>
            <Field label="Giá khuyến mãi">
              <input
                type="number"
                min={0}
                value={form.discount_price ?? ""}
                onChange={(e) =>
                  update("discount_price", e.target.value ? Number(e.target.value) : undefined)
                }
                className="input"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-circuit-muted">
            <input
              type="checkbox"
              checked={form.is_installment_eligible}
              onChange={(e) => update("is_installment_eligible", e.target.checked)}
              className="accent-circuit-copper"
            />
            Cho phép mua trả góp
          </label>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-circuit-copper py-2.5 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {isEditing ? "Lưu thay đổi" : "Nhập sản phẩm"}
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
