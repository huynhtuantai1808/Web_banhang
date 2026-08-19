"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutGrid, Loader2, Plus, PencilLine, Trash2, Check, X, ImagePlus, CornerDownRight,
} from "lucide-react";
import {
  listBrands, createBrand, updateBrand, deleteBrand,
  listCategories, createCategory, updateCategory, deleteCategory, uploadCategoryBanner,
  CatalogOption, CategoryOption,
} from "@/lib/services/products";
import { getMediaUrl } from "@/lib/media";
import { ApiError } from "@/lib/apiClient";

export default function AdminCategoriesPage() {
  const [brands, setBrands] = useState<CatalogOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, c] = await Promise.all([listBrands(), listCategories()]);
      setBrands(b);
      setCategories(c);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="px-8 py-8 text-circuit-text max-w-4xl">
      <header className="mb-6">
        <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest">Quản trị</p>
        <h1 className="font-display text-2xl mt-1 flex items-center gap-2">
          <LayoutGrid size={22} /> Phân loại (Hãng &amp; Danh mục)
        </h1>
      </header>

      {error && (
        <div className="mb-6 rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-circuit-muted">
          <Loader2 className="animate-spin mr-2" size={18} /> Đang tải...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BrandSection
            brands={brands}
            onCreate={async (name) => { await createBrand(name); await load(); }}
            onUpdate={async (id, name) => { await updateBrand(id, name); await load(); }}
            onDelete={async (id) => { await deleteBrand(id); await load(); }}
            onError={setError}
          />
          <CategorySection
            categories={categories}
            onCreate={async (name, parentId) => { await createCategory(name, parentId); await load(); }}
            onUpdate={async (id, name, parentId) => { await updateCategory(id, name, parentId); await load(); }}
            onDelete={async (id) => { await deleteCategory(id); await load(); }}
            onBannerUpload={async (id, file) => { await uploadCategoryBanner(id, file); await load(); }}
            onError={setError}
          />
        </div>
      )}
    </main>
  );
}

// ================= Hãng (danh sách phẳng, đơn giản) =================

function BrandSection({
  brands, onCreate, onUpdate, onDelete, onError,
}: {
  brands: CatalogOption[];
  onCreate: (name: string) => Promise<void>;
  onUpdate: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await onCreate(newName.trim());
      setNewName("");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Thêm thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit() {
    if (editingId === null) return;
    setBusy(true);
    try {
      await onUpdate(editingId, editingName.trim());
      setEditingId(null);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Xoá hãng này? (không xoá được nếu vẫn còn sản phẩm thuộc hãng)")) return;
    setBusy(true);
    try {
      await onDelete(id);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Xoá thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-circuit-line bg-circuit-panel p-5">
      <h2 className="font-display text-lg text-circuit-text mb-4">Hãng</h2>

      <form onSubmit={handleCreate} className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Tên hãng mới..."
          className="flex-1 rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text outline-none focus:border-circuit-copper"
        />
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="rounded-md bg-circuit-copper px-3 text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50"
        >
          <Plus size={16} />
        </button>
      </form>

      <div className="space-y-1.5 max-h-96 overflow-y-auto">
        {brands.length === 0 && <p className="text-sm text-circuit-muted">Chưa có hãng nào.</p>}
        {brands.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-md border border-circuit-line px-3 py-2">
            {editingId === item.id ? (
              <>
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="flex-1 bg-transparent border-b border-circuit-copper text-sm text-circuit-text outline-none"
                  autoFocus
                />
                <button onClick={handleSaveEdit} disabled={busy} className="text-circuit-signal hover:opacity-80">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingId(null)} className="text-circuit-muted hover:text-red-400">
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-circuit-text">{item.name}</span>
                <button
                  onClick={() => { setEditingId(item.id); setEditingName(item.name); }}
                  className="p-1 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight"
                >
                  <PencilLine size={14} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 rounded hover:bg-circuit-line text-circuit-muted hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ================= Danh mục (dạng cây cha/con + banner riêng) =================

interface CategoryNode extends CategoryOption {
  children: CategoryNode[];
}

function buildTree(flat: CategoryOption[]): CategoryNode[] {
  const nodes = new Map<number, CategoryNode>(flat.map((c) => [c.id, { ...c, children: [] }]));
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    if (node.parent_id && nodes.has(node.parent_id)) {
      nodes.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function CategorySection({
  categories, onCreate, onUpdate, onDelete, onBannerUpload, onError,
}: {
  categories: CategoryOption[];
  onCreate: (name: string, parentId?: number) => Promise<void>;
  onUpdate: (id: number, name: string, parentId?: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onBannerUpload: (id: number, file: File) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingParentId, setEditingParentId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetId = useRef<number | null>(null);

  const tree = buildTree(categories);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await onCreate(newName.trim(), newParentId ? Number(newParentId) : undefined);
      setNewName("");
      setNewParentId("");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Thêm thất bại");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(cat: CategoryOption) {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setEditingParentId(cat.parent_id?.toString() ?? "");
  }

  async function handleSaveEdit() {
    if (editingId === null) return;
    setBusy(true);
    try {
      await onUpdate(editingId, editingName.trim(), editingParentId ? Number(editingParentId) : undefined);
      setEditingId(null);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Cập nhật thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Xoá danh mục này? (không xoá được nếu còn sản phẩm hoặc danh mục con)")) return;
    setBusy(true);
    try {
      await onDelete(id);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Xoá thất bại");
    } finally {
      setBusy(false);
    }
  }

  function triggerBannerUpload(id: number) {
    uploadTargetId.current = id;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const id = uploadTargetId.current;
    if (!file || id === null) return;
    setUploadingId(id);
    try {
      await onBannerUpload(id, file);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Tải banner thất bại");
    } finally {
      setUploadingId(null);
      e.target.value = "";
    }
  }

  function renderNode(node: CategoryNode, depth: number) {
    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 rounded-md border border-circuit-line px-3 py-2"
          style={{ marginLeft: depth * 16 }}
        >
          {depth > 0 && <CornerDownRight size={13} className="text-circuit-muted shrink-0" />}

          <div className="w-7 h-7 shrink-0 rounded bg-circuit-bg/60 overflow-hidden flex items-center justify-center">
            {node.banner_image_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={getMediaUrl(node.banner_image_url)} alt="" className="object-cover w-full h-full" />
            ) : (
              <ImagePlus size={12} className="text-circuit-muted" />
            )}
          </div>

          {editingId === node.id ? (
            <>
              <input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="flex-1 bg-transparent border-b border-circuit-copper text-sm text-circuit-text outline-none"
                autoFocus
              />
              <select
                value={editingParentId}
                onChange={(e) => setEditingParentId(e.target.value)}
                className="text-xs rounded border border-circuit-line bg-circuit-bg text-circuit-muted px-1 py-1"
              >
                <option value="">— Cấp gốc —</option>
                {categories.filter((c) => c.id !== node.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button onClick={handleSaveEdit} disabled={busy} className="text-circuit-signal hover:opacity-80">
                <Check size={16} />
              </button>
              <button onClick={() => setEditingId(null)} className="text-circuit-muted hover:text-red-400">
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm text-circuit-text">{node.name}</span>
              <button
                onClick={() => triggerBannerUpload(node.id)}
                title="Tải ảnh banner riêng cho danh mục này"
                className="p-1 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight"
              >
                {uploadingId === node.id ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
              </button>
              <button
                onClick={() => startEdit(node)}
                className="p-1 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight"
              >
                <PencilLine size={14} />
              </button>
              <button
                onClick={() => handleDelete(node.id)}
                className="p-1 rounded hover:bg-circuit-line text-circuit-muted hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
        {node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-circuit-line bg-circuit-panel p-5">
      <h2 className="font-display text-lg text-circuit-text mb-1">Danh mục</h2>
      <p className="text-xs text-circuit-muted mb-4">
        Hỗ trợ danh mục cha/con (VD: Laptop → Laptop Gaming) + ảnh banner riêng cho từng danh mục
        (hiện khi khách click vào trang danh mục đó).
      </p>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <form onSubmit={handleCreate} className="space-y-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Tên danh mục mới..."
          className="w-full rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text outline-none focus:border-circuit-copper"
        />
        <div className="flex gap-2">
          <select
            value={newParentId}
            onChange={(e) => setNewParentId(e.target.value)}
            className="flex-1 rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text"
          >
            <option value="">— Danh mục cấp gốc —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy || !newName.trim()}
            className="rounded-md bg-circuit-copper px-3 text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50"
          >
            <Plus size={16} />
          </button>
        </div>
      </form>

      <div className="space-y-1.5 max-h-96 overflow-y-auto">
        {tree.length === 0 && <p className="text-sm text-circuit-muted">Chưa có danh mục nào.</p>}
        {tree.map((node) => renderNode(node, 0))}
      </div>
    </div>
  );
}
