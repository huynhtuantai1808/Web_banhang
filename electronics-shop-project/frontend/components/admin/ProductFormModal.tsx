"use client";

import { useEffect, useState, useRef } from "react";
import { X, Loader2, Star, Plus, Trash2, ImagePlus, Check } from "lucide-react";
import {
  createProduct, updateProduct, ProductOut, ProductInput,
  listBrands, listCategories, getProductReviews,
  listProductImages, uploadProductImage, deleteProductImage, setPrimaryImage,
  CatalogOption, CategoryOption, ReviewOut, ProductImageOut,
} from "@/lib/services/products";
import { ApiError } from "@/lib/apiClient";
import { getMediaUrl } from "@/lib/media";
import RichTextEditor from "./RichTextEditor";

const EMPTY_FORM: ProductInput = {
  product_code: "",
  name: "",
  description: "",
  long_description: "",
  video_url: "",
  brand: "",
  brand_id: undefined,
  category: "",
  category_id: undefined,
  color: "",
  material: "",
  size_dimension: "",
  specification: undefined,
  price: 0,
  discount_price: undefined,
  is_installment_eligible: true,
};

type SpecEntry = { key: string; value: string };

function emptySpec(): SpecEntry { return { key: "", value: "" }; }

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
  const [specRows, setSpecRows] = useState<SpecEntry[]>([emptySpec()]);
  const [brands, setBrands] = useState<CatalogOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "images" | "reviews">("info");
  const [reviews, setReviews] = useState<ReviewOut[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Images
  const [images, setImages] = useState<ProductImageOut[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
    setActiveTab("info");
    if (editingProduct) {
      // Populate specification rows
      const specs = editingProduct.specification;
      let rows: SpecEntry[];
      if (specs && typeof specs === "object") {
        rows = Object.entries(specs as Record<string, unknown>).map(([k, v]) => ({
          key: k,
          value: String(v ?? ""),
        }));
      } else {
        rows = [];
      }
      if (rows.length === 0) rows.push(emptySpec());
      setSpecRows(rows);

      setForm({
        product_code: editingProduct.product_code,
        name: editingProduct.name,
        description: editingProduct.description ?? "",
        long_description: editingProduct.long_description ?? "",
        video_url: editingProduct.video_url ?? "",
        brand: editingProduct.brand ?? "",
        brand_id: undefined,
        category: editingProduct.category ?? "",
        category_id: undefined,
        color: editingProduct.color ?? "",
        material: editingProduct.material ?? "",
        size_dimension: editingProduct.size_dimension ?? "",
        specification: undefined,
        price: editingProduct.price,
        discount_price: editingProduct.discount_price ?? undefined,
        is_installment_eligible: editingProduct.is_installment_eligible,
      });

      // Load images
      listProductImages(editingProduct.id)
        .then(setImages)
        .catch(() => setImages([]));

      // Load reviews
      setLoadingReviews(true);
      getProductReviews(editingProduct.id)
        .then(setReviews)
        .catch(() => setReviews([]))
        .finally(() => setLoadingReviews(false));
    } else {
      setForm(EMPTY_FORM);
      setSpecRows([emptySpec()]);
      setReviews([]);
      setImages([]);
    }
    setError(null);
  }, [open, editingProduct]);

  // Sync spec rows → form.specification before save
  function buildSpecFromRows(rows: SpecEntry[]): Record<string, unknown> | undefined {
    const valid = rows.filter((r) => r.key.trim() && r.value.trim());
    if (valid.length === 0) return undefined;
    return Object.fromEntries(valid.map((r) => [r.key.trim(), r.value.trim()]));
  }

  function update<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectBrand(id: number) {
    const found = brands.find((b) => b.id === id);
    setForm((prev) => ({ ...prev, brand_id: id, brand: found?.name ?? "" }));
  }

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
      const payload: ProductInput = {
        ...form,
        specification: buildSpecFromRows(specRows),
      };
      if (isEditing && editingProduct) {
        await updateProduct(editingProduct.id, payload);
      } else {
        await createProduct(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu sản phẩm thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;
    setUploadingImage(true);
    try {
      const newImage = await uploadProductImage(editingProduct.id, file, images.length === 0);
      setImages((prev) => [
        ...prev,
        { id: Date.now().toString(), product_id: editingProduct.id, url: newImage.image_url, is_primary: prev.length === 0 },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tải ảnh thất bại");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  async function handleSetPrimary(imageId: string) {
    setSettingPrimary(imageId);
    try {
      await setPrimaryImage(imageId);
      setImages((prev) =>
        prev.map((i) => ({ ...i, is_primary: i.id === imageId }))
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đặt ảnh đại diện thất bại");
    } finally {
      setSettingPrimary(null);
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!confirm("Xoá ảnh này?")) return;
    try {
      await deleteProductImage(imageId);
      setImages((prev) => prev.filter((i) => i.id !== imageId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xoá ảnh thất bại");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-lg border border-circuit-line bg-circuit-panel p-6 mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg text-circuit-text">
            {isEditing ? "Sửa sản phẩm" : "Nhập sản phẩm mới"}
          </h2>
          <button onClick={onClose} className="text-circuit-muted hover:text-circuit-text">
            <X size={20} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-circuit-line mb-5">
          <button
            onClick={() => setActiveTab("info")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "info"
                ? "border-circuit-copper text-circuit-copperLight"
                : "border-transparent text-circuit-muted hover:text-circuit-text"
            }`}
          >
            Thông tin sản phẩm
          </button>
          {isEditing && (
            <>
              <button
                onClick={() => setActiveTab("images")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "images"
                    ? "border-circuit-copper text-circuit-copperLight"
                    : "border-transparent text-circuit-muted hover:text-circuit-text"
                }`}
              >
                Hình ảnh ({images.length})
              </button>
              <button
                onClick={() => setActiveTab("reviews")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "reviews"
                    ? "border-circuit-copper text-circuit-copperLight"
                    : "border-transparent text-circuit-muted hover:text-circuit-text"
                }`}
              >
                Đánh giá ({reviews.length})
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ── Tab: Thông tin ── */}
        {activeTab === "info" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mã sản phẩm *">
                <input required disabled={isEditing} value={form.product_code}
                  onChange={(e) => update("product_code", e.target.value)} className="input" placeholder="SP000123" />
              </Field>
              <Field label="Tên sản phẩm *">
                <input required value={form.name}
                  onChange={(e) => update("name", e.target.value)} className="input" placeholder="iPhone 16 Pro Max 256GB" />
              </Field>
            </div>

            <Field label="Mô tả ngắn">
              <textarea value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className="input min-h-[60px]" placeholder="Mô tả ngắn về sản phẩm..." />
            </Field>

            <Field label="Mô tả chi tiết (WYSIWYG)">
              {/* @ts-ignore */}
              <RichTextEditor
                value={form.long_description ?? ""}
                onChange={(html: string) => update("long_description", html)}
              />
            </Field>

            <Field label="Link video giới thiệu">
              <input value={form.video_url}
                onChange={(e) => update("video_url", e.target.value)} className="input"
                placeholder="https://www.youtube.com/watch?v=..." />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Hãng *">
                {loadingOptions ? (
                  <div className="input flex items-center gap-2 text-circuit-muted text-sm">
                    <Loader2 size={14} className="animate-spin" /> Đang tải...
                  </div>
                ) : (
                  <select value={form.brand_id ?? ""}
                    onChange={(e) => selectBrand(Number(e.target.value))} className="input">
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
                  <select value={form.category_id ?? ""}
                    onChange={(e) => selectCategory(Number(e.target.value))} className="input">
                    <option value="">— Chọn danh mục —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.parent_id ? `    ${c.name}` : c.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Màu sắc">
                <input value={form.color}
                  onChange={(e) => update("color", e.target.value)} className="input" placeholder="Đen, Titan..." />
              </Field>
              <Field label="Chất liệu">
                <input value={form.material}
                  onChange={(e) => update("material", e.target.value)} className="input" />
              </Field>
              <Field label="Kích thước">
                <input value={form.size_dimension}
                  onChange={(e) => update("size_dimension", e.target.value)} className="input" />
              </Field>
            </div>

            {/* Thông số kỹ thuật */}
            <Field label="Thông số kỹ thuật">
              <div className="space-y-2">
                {specRows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      value={row.key}
                      onChange={(e) => {
                        const updated = [...specRows];
                        updated[i] = { ...row, key: e.target.value };
                        setSpecRows(updated);
                      }}
                      className="input flex-1"
                      placeholder="VD: CPU"
                    />
                    <input
                      value={row.value}
                      onChange={(e) => {
                        const updated = [...specRows];
                        updated[i] = { ...row, value: e.target.value };
                        setSpecRows(updated);
                      }}
                      className="input flex-1"
                      placeholder="VD: Intel i5-1235U"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (specRows.length > 1) {
                          setSpecRows(specRows.filter((_, j) => j !== i));
                        } else {
                          setSpecRows([emptySpec()]);
                        }
                      }}
                      className="p-2 rounded text-circuit-muted hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSpecRows([...specRows, emptySpec()])}
                  className="flex items-center gap-1 text-xs text-circuit-copperLight hover:text-circuit-copper transition-colors mt-1"
                >
                  <Plus size={12} /> Thêm dòng thông số
                </button>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Giá bán *">
                <input required type="number" min={0} value={form.price || ""}
                  onChange={(e) => update("price", Number(e.target.value))} className="input" />
              </Field>
              <Field label="Giá khuyến mãi">
                <input type="number" min={0} value={form.discount_price ?? ""}
                  onChange={(e) => update("discount_price", e.target.value ? Number(e.target.value) : undefined)}
                  className="input" />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm text-circuit-muted">
              <input type="checkbox" checked={form.is_installment_eligible}
                onChange={(e) => update("is_installment_eligible", e.target.checked)}
                className="accent-circuit-copper" />
              Cho phép mua trả góp
            </label>

            <button type="submit" disabled={saving}
              className="w-full rounded-md bg-circuit-copper py-2.5 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 size={16} className="animate-spin" />}
              {isEditing ? "Lưu thay đổi" : "Nhập sản phẩm"}
            </button>
          </form>
        )}

        {/* ── Tab: Hình ảnh ── */}
        {activeTab === "images" && isEditing && (
          <div className="space-y-4">
            {/* Upload */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 rounded-md bg-circuit-copper px-4 py-2 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors cursor-pointer">
                {uploadingImage ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ImagePlus size={14} />
                )}
                Tải ảnh lên
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                  onChange={handleUploadImage} disabled={uploadingImage} />
              </label>
              <span className="text-xs text-circuit-muted">
                PNG, JPG, WEBP — ảnh đầu tiên sẽ là ảnh đại diện
              </span>
            </div>

            {/* Image grid */}
            {images.length === 0 ? (
              <p className="text-sm text-circuit-muted py-6 text-center border border-dashed border-circuit-line rounded-lg">
                Chưa có ảnh nào. Bấm "Tải ảnh lên" để thêm.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {images.map((img) => (
                  <div key={img.id} className="relative group rounded-lg border overflow-hidden bg-circuit-bg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getMediaUrl(img.url)}
                      alt=""
                      className="aspect-square w-full object-contain"
                    />
                    {img.is_primary && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-circuit-copper text-circuit-bg">
                        Đại diện
                      </div>
                    )}
                    {/* Overlay actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {!img.is_primary && (
                        <button
                          onClick={() => handleSetPrimary(img.id)}
                          disabled={settingPrimary === img.id}
                          className="flex items-center gap-1 rounded bg-circuit-copper px-2 py-1 text-xs text-circuit-bg hover:bg-circuit-copperLight transition-colors"
                        >
                          {settingPrimary === img.id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <Check size={10} />
                          )}
                          Đặt đại diện
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        className="flex items-center gap-1 rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-400 transition-colors"
                      >
                        <Trash2 size={10} /> Xoá
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Đánh giá ── */}
        {activeTab === "reviews" && isEditing && (
          <div>
            {loadingReviews ? (
              <div className="flex items-center justify-center py-10 text-circuit-muted">
                <Loader2 size={16} className="animate-spin mr-2" /> Đang tải đánh giá...
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-circuit-muted py-6 text-center">Chưa có đánh giá nào cho sản phẩm này.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="border border-circuit-line rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-circuit-copper/20 flex items-center justify-center text-xs font-bold text-circuit-copper">
                          {r.customer_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="text-sm font-medium text-circuit-text">{r.customer_name || "Khách hàng"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={12}
                              className={s <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-circuit-line"} />
                          ))}
                        </div>
                        <span className="text-xs text-circuit-muted">
                          {new Date(r.created_at).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-circuit-text leading-relaxed">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
        .input:focus { border-color: #c87f45; }
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
