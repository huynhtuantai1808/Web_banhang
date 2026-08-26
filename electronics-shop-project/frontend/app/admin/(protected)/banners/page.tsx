"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus, Megaphone, Loader2, Trash2, Eye, EyeOff, Pencil, X, ImagePlus, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  Banner, listAllBanners, createBanner, updateBanner, deleteBanner, replaceBannerImage,
} from "@/lib/services/banners";
import { ApiError } from "@/lib/apiClient";
import { getMediaUrl } from "@/lib/media";

const POSITION_TABS: { key: string; label: string }[] = [
  { key: "hero", label: "Hero (carousel lớn)" },
  { key: "promo", label: "Promo (chương trình ưu đãi)" },
  { key: "sidebar", label: "Sidebar" },
];

interface FormState {
  title: string;
  subtitle: string;
  description: string;
  link_url: string;
  cta_label: string;
  position: string;
  display_order: number;
  is_active: boolean;
  file: File | null;
}

const EMPTY_FORM: FormState = {
  title: "",
  subtitle: "",
  description: "",
  link_url: "",
  cta_label: "Khám phá ngay",
  position: "hero",
  display_order: 0,
  is_active: true,
  file: null,
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [position, setPosition] = useState<string>("hero");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const data = await listAllBanners();
      setBanners(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được danh sách banner");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBanners(); }, []);

  const filtered = banners
    .filter((b) => b.position === position)
    .sort((a, b) => a.display_order - b.display_order);

  function openCreate() {
    setEditingBanner(null);
    setForm({ ...EMPTY_FORM, position });
    setModalOpen(true);
    setError(null);
  }

  function openEdit(b: Banner) {
    setEditingBanner(b);
    setForm({
      title: b.title,
      subtitle: b.subtitle ?? "",
      description: b.description ?? "",
      link_url: b.link_url ?? "",
      cta_label: b.cta_label ?? "",
      position: b.position,
      display_order: b.display_order,
      is_active: b.is_active,
      file: null,
    });
    setModalOpen(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Vui lòng nhập tiêu đề banner");
      return;
    }
    if (!editingBanner && !form.file) {
      setError("Vui lòng chọn ảnh banner");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editingBanner) {
        await updateBanner(editingBanner.id, {
          title: form.title,
          subtitle: form.subtitle || null,
          description: form.description || null,
          link_url: form.link_url || null,
          cta_label: form.cta_label || null,
          position: form.position,
          display_order: form.display_order,
          is_active: form.is_active,
        });
        if (form.file) {
          await replaceBannerImage(editingBanner.id, form.file);
        }
      } else {
        const fd = new FormData();
        fd.append("title", form.title);
        fd.append("subtitle", form.subtitle);
        fd.append("description", form.description);
        fd.append("link_url", form.link_url);
        fd.append("cta_label", form.cta_label);
        fd.append("position", form.position);
        fd.append("display_order", String(form.display_order));
        if (form.file) fd.append("image", form.file);
        await createBanner(fd);
      }
      setModalOpen(false);
      setBanner({ type: "success", text: editingBanner ? "Đã cập nhật banner" : "Đã tạo banner mới" });
      await fetchBanners();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu banner thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá banner này?")) return;
    try {
      await deleteBanner(id);
      setBanner({ type: "success", text: "Đã xoá banner" });
      await fetchBanners();
    } catch (err) {
      setBanner({ type: "error", text: err instanceof ApiError ? err.message : "Xoá thất bại" });
    }
  }

  async function toggleActive(b: Banner) {
    try {
      await updateBanner(b.id, { is_active: !b.is_active });
      await fetchBanners();
    } catch (err) {
      setBanner({ type: "error", text: err instanceof ApiError ? err.message : "Cập nhật thất bại" });
    }
  }

  async function moveOrder(b: Banner, direction: -1 | 1) {
    const target = direction === -1
      ? filtered.filter((x) => x.display_order < b.display_order).sort((a, x) => x.display_order - a.display_order)[0]
      : filtered.filter((x) => x.display_order > b.display_order).sort((a, x) => a.display_order - x.display_order)[0];
    if (!target) return;
    try {
      // swap display_order
      const tmp = b.display_order;
      await updateBanner(b.id, { display_order: target.display_order });
      await updateBanner(target.id, { display_order: tmp });
      await fetchBanners();
    } catch (err) {
      setBanner({ type: "error", text: err instanceof ApiError ? err.message : "Đổi thứ tự thất bại" });
    }
  }

  return (
    <main className="px-8 py-8 text-circuit-text">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest">Quản trị</p>
          <h1 className="font-display text-2xl mt-1 flex items-center gap-2">
            <Megaphone size={22} /> Quản lý quảng cáo
          </h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-md bg-circuit-copper px-4 py-2 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors"
        >
          <Plus size={16} /> Thêm banner
        </button>
      </header>

      {banner && (
        <div className={`mb-6 rounded-md border px-4 py-3 text-sm ${
          banner.type === "success"
            ? "border-circuit-line bg-circuit-panel text-circuit-signal"
            : "border-red-400/40 bg-red-400/10 text-red-300"
        }`}>
          {banner.text}
        </div>
      )}

      {/* Position tabs */}
      <div className="flex gap-2 mb-6 border-b border-circuit-line">
        {POSITION_TABS.map((tab) => {
          const count = banners.filter((b) => b.position === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setPosition(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                position === tab.key
                  ? "border-circuit-copper text-circuit-copperLight"
                  : "border-transparent text-circuit-muted hover:text-circuit-text"
              }`}
            >
              {tab.label} <span className="ml-1 text-xs text-circuit-muted">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-circuit-muted">
          <Loader2 className="animate-spin mr-2" size={20} /> Đang tải...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-circuit-line rounded-xl">
          <Megaphone size={32} className="text-circuit-muted mb-3" />
          <p className="text-circuit-muted text-sm">Chưa có banner nào ở vị trí này.</p>
          <button onClick={openCreate} className="mt-3 text-circuit-copperLight hover:text-circuit-copper text-sm">
            + Tạo banner đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((b, i) => (
            <div key={b.id} className="rounded-xl border border-circuit-line bg-circuit-panel overflow-hidden">
              {/* Preview */}
              <div className="relative aspect-[16/8] bg-circuit-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getMediaUrl(b.image_url)}
                  alt={b.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                />
                {!b.is_active && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-medium">Đang ẩn</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-display text-base text-circuit-text">{b.title}</h3>
                {b.subtitle && <p className="text-sm text-circuit-copperLight mt-0.5">{b.subtitle}</p>}
                {b.description && <p className="text-xs text-circuit-muted mt-2 line-clamp-2">{b.description}</p>}

                <div className="flex items-center gap-2 mt-3 text-xs text-circuit-muted">
                  {b.cta_label && <span className="px-2 py-0.5 rounded bg-circuit-line">CTA: {b.cta_label}</span>}
                  {b.link_url && <span className="truncate">→ {b.link_url}</span>}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 mt-4 pt-3 border-t border-circuit-line">
                  <button
                    onClick={() => moveOrder(b, -1)}
                    disabled={i === 0}
                    className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight disabled:opacity-30"
                    title="Lên"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => moveOrder(b, 1)}
                    disabled={i === filtered.length - 1}
                    className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight disabled:opacity-30"
                    title="Xuống"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => toggleActive(b)}
                    className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight"
                    title={b.is_active ? "Ẩn" : "Hiện"}
                  >
                    {b.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => openEdit(b)}
                    className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight"
                    title="Sửa"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-red-400"
                    title="Xoá"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-lg rounded-lg border border-circuit-line bg-circuit-panel p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg text-circuit-text">
                {editingBanner ? "Sửa banner" : "Thêm banner mới"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-circuit-muted hover:text-circuit-text">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <Field label="Tiêu đề *">
                <input required value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input" placeholder="ĐỔI MỚI SANG TRANG" />
              </Field>

              <Field label="Phụ đề">
                <input value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  className="input" placeholder="TƯƠNG LAI VỰT SÁNG" />
              </Field>

              <Field label="Mô tả">
                <textarea value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input min-h-[60px]" placeholder="Ưu đãi đến 2.5TR+..." />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Link đích">
                  <input value={form.link_url}
                    onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                    className="input" placeholder="/products?category_id=1" />
                </Field>
                <Field label="Nhãn CTA">
                  <input value={form.cta_label}
                    onChange={(e) => setForm({ ...form, cta_label: e.target.value })}
                    className="input" placeholder="Khám phá ngay" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Vị trí">
                  <select value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="input">
                    {POSITION_TABS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </Field>
                <Field label="Thứ tự hiển thị">
                  <input type="number" value={form.display_order}
                    onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
                    className="input" />
                </Field>
              </div>

              <Field label={editingBanner ? "Ảnh (bỏ trống nếu giữ nguyên)" : "Ảnh banner *"}>
                <label className="flex items-center gap-2 rounded-md border border-dashed border-circuit-line bg-circuit-bg px-4 py-3 cursor-pointer hover:border-circuit-copper transition-colors">
                  <ImagePlus size={16} className="text-circuit-muted" />
                  <span className="text-sm text-circuit-muted">
                    {form.file ? form.file.name : "Chọn ảnh từ máy..."}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
                  />
                </label>
                {!editingBanner && !form.file && (
                  <p className="text-xs text-circuit-muted mt-1">PNG, JPG, WEBP, GIF · Tối đa 10MB</p>
                )}
              </Field>

              <label className="flex items-center gap-2 text-sm text-circuit-muted">
                <input type="checkbox" checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="accent-circuit-copper" />
                Hiển thị banner
              </label>

              <button type="submit" disabled={saving}
                className="w-full rounded-md bg-circuit-copper py-2.5 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editingBanner ? "Lưu thay đổi" : "Tạo banner"}
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
            .input:focus { border-color: #c87f45; }
          `}</style>
        </div>
      )}
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
