"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Plus, FileText, Loader2, Trash2, Pencil, X, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import {
  BlogPost, BlogPostInput, listAllPosts, createPost, updatePost, deletePost,
} from "@/lib/services/blog";
import { uploadBannerImage } from "@/lib/services/banners";
import { ApiError } from "@/lib/apiClient";
import { getMediaUrl } from "@/lib/media";

// React Quill phải dynamic import vì nó dùng document
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false, loading: () => (
  <div className="h-40 bg-circuit-bg border border-circuit-line rounded flex items-center justify-center text-circuit-muted text-sm">
    Đang tải trình soạn thảo...
  </div>
)});

const CATEGORIES = [
  { key: "news", label: "Tin tức" },
  { key: "promotion", label: "Khuyến mãi" },
  { key: "guide", label: "Hướng dẫn" },
];

const EMPTY_FORM = (): BlogPostInput => ({
  title: "",
  summary: "",
  content: "",
  image_url: "",
  category: "news",
  is_published: true,
  display_order: 0,
});

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [category, setCategory] = useState<string>("news");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogPostInput>(EMPTY_FORM());
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await listAllPosts({ category });
      setPosts(data);
    } catch {
      setError("Không tải được danh sách bài viết");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, [category]);

  function openCreate() {
    setEditingPost(null);
    setForm(EMPTY_FORM());
    setModalOpen(true);
    setError(null);
  }

  function openEdit(p: BlogPost) {
    setEditingPost(p);
    setForm({
      title: p.title,
      summary: p.summary ?? "",
      content: p.content ?? "",
      image_url: p.image_url ?? "",
      category: p.category,
      is_published: p.is_published,
      display_order: p.display_order,
    });
    setModalOpen(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Vui lòng nhập tiêu đề"); return; }
    if (!form.content?.trim()) { setError("Vui lòng nhập nội dung bài viết"); return; }

    setSaving(true);
    setError(null);
    try {
      if (editingPost) {
        await updatePost(editingPost.id, form);
        setMsg({ type: "success", text: "Đã cập nhật bài viết" });
      } else {
        await createPost(form);
        setMsg({ type: "success", text: "Đã tạo bài viết mới" });
      }
      setModalOpen(false);
      await fetchPosts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá bài viết này?")) return;
    try {
      await deletePost(id);
      setMsg({ type: "success", text: "Đã xoá bài viết" });
      await fetchPosts();
    } catch (err) {
      setMsg({ type: "error", text: err instanceof ApiError ? err.message : "Xoá thất bại" });
    }
  }

  async function handleToggle(p: BlogPost) {
    try {
      await updatePost(p.id, { is_published: !p.is_published });
      await fetchPosts();
    } catch (err) {
      setMsg({ type: "error", text: err instanceof ApiError ? err.message : "Cập nhật thất bại" });
    }
  }

  return (
    <main className="px-8 py-8 text-circuit-text">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest">Quản trị</p>
          <h1 className="font-display text-2xl mt-1 flex items-center gap-2">
            <FileText size={22} /> Quản lý bài viết
          </h1>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-md bg-circuit-copper px-4 py-2 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors">
          <Plus size={16} /> Thêm bài viết
        </button>
      </header>

      {msg && (
        <div className={`mb-6 rounded-md border px-4 py-3 text-sm ${
          msg.type === "success" ? "border-circuit-line bg-circuit-panel text-circuit-signal" : "border-red-400/40 bg-red-400/10 text-red-300"
        }`}>{msg.text}</div>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 border-b border-circuit-line">
        {CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => setCategory(c.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${category === c.key ? "border-circuit-copper text-circuit-copperLight" : "border-transparent text-circuit-muted hover:text-circuit-text"}`}>
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-circuit-muted">
          <Loader2 className="animate-spin mr-2" size={20} /> Đang tải...
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-circuit-line rounded-xl">
          <FileText size={32} className="text-circuit-muted mb-3" />
          <p className="text-circuit-muted text-sm">Chưa có bài viết nào.</p>
          <button onClick={openCreate} className="mt-3 text-circuit-copperLight hover:text-circuit-copper text-sm">+ Tạo bài viết đầu tiên</button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center gap-4 rounded-lg border border-circuit-line bg-circuit-panel px-4 py-3">
              <div className="w-16 h-12 rounded overflow-hidden bg-circuit-bg shrink-0">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getMediaUrl(p.image_url)} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-circuit-muted"><FileText size={16} /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-circuit-text truncate">{p.title}</h3>
                <p className="text-xs text-circuit-muted mt-0.5 line-clamp-1">{p.summary || "—"}</p>
                <p className="text-[10px] text-circuit-muted mt-1">
                  {new Date(p.created_at).toLocaleDateString("vi-VN")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!p.is_published && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Bản nháp</span>
                )}
                <button onClick={() => handleToggle(p)}
                  className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight"
                  title={p.is_published ? "Gỡ xuất bản" : "Xuất bản"}>
                  {p.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button onClick={() => openEdit(p)}
                  className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight" title="Sửa">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(p.id)}
                  className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-red-400" title="Xoá">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-lg border border-circuit-line bg-circuit-panel p-6 mb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg text-circuit-text">{editingPost ? "Sửa bài viết" : "Thêm bài viết mới"}</h2>
              <button onClick={() => setModalOpen(false)} className="text-circuit-muted hover:text-circuit-text"><X size={20} /></button>
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Tiêu đề *">
                  <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="input" placeholder="Tiêu đề bài viết" />
                </Field>
                <Field label="Danh mục">
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
                    {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Thứ tự">
                  <input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
                    className="input" />
                </Field>
              </div>

              <Field label="Tóm tắt">
                <textarea value={form.summary ?? ""} onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  className="input min-h-[60px]" placeholder="Mô tả ngắn cho danh sách bài viết..." />
              </Field>

              <Field label="Nội dung *">
                <div className="rounded overflow-hidden border border-circuit-line">
                  <ReactQuill
                    value={form.content ?? ""}
                    onChange={(val) => setForm({ ...form, content: val })}
                    theme="snow"
                    className="bg-circuit-bg text-circuit-text [&_.ql-editor]:min-h-[200px]"
                  />
                </div>
              </Field>

              <Field label="Ảnh đại diện">
                <div className="flex items-center gap-3">
                  {form.image_url && (
                    <div className="relative w-20 h-14 rounded overflow-hidden border border-circuit-line shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={getMediaUrl(form.image_url)} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <label className="flex-1 flex items-center gap-2 rounded-md border border-dashed border-circuit-line bg-circuit-bg px-4 py-2 cursor-pointer hover:border-circuit-copper transition-colors">
                    <span className="text-sm text-circuit-muted truncate">{form.image_url ? "Chọn ảnh khác..." : "Chọn ảnh..."}</span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingImage(true);
                        try {
                          const url = await uploadBannerImage(file);
                          setForm({ ...form, image_url: url });
                        } catch { /* ignore */ } finally { setUploadingImage(false); }
                      }} />
                    {uploadingImage && <Loader2 size={14} className="animate-spin text-circuit-muted shrink-0" />}
                  </label>
                  {form.image_url && (
                    <button type="button" onClick={() => setForm({ ...form, image_url: "" })}
                      className="text-xs text-red-400 hover:text-red-300 shrink-0">Xoá</button>
                  )}
                </div>
              </Field>

              <label className="flex items-center gap-2 text-sm text-circuit-muted">
                <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  className="accent-circuit-copper" />
                Xuất bản ngay
              </label>

              <button type="submit" disabled={saving}
                className="w-full rounded-md bg-circuit-copper py-2.5 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editingPost ? "Lưu thay đổi" : "Tạo bài viết"}
              </button>
            </form>
          </div>
        </div>
      )}

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
        .ql-toolbar { background: #0f1c2d !important; border-color: #1e2c47 !important; }
        .ql-container { border-color: #1e2c47 !important; background: #0b1220 !important; }
        .ql-editor { color: #e7ecf5 !important; font-size: 0.9rem !important; }
        .ql-editor.ql-blank::before { color: #4a5a7a !important; font-style: normal !important; }
        .ql-stroke { stroke: #c87f45 !important; }
        .ql-fill { fill: #c87f45 !important; }
        .ql-picker { color: #c87f45 !important; }
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
