"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutGrid, Loader2, Plus, PencilLine, Trash2, Check, X, ImagePlus,
  CornerDownRight, ChevronDown, ChevronUp, BookOpen,
} from "lucide-react";
import {
  listBrands, createBrand, updateBrand, deleteBrand,
  listCategories, createCategory, updateCategory, deleteCategory, uploadCategoryBanner,
  CatalogOption, CategoryOption,
} from "@/lib/services/products";
import { getMediaUrl } from "@/lib/media";
import { ApiError } from "@/lib/apiClient";

type Tab = "brands" | "categories";

export default function AdminCategoriesPage() {
  const [brands, setBrands] = useState<CatalogOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("categories");

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

  useEffect(() => { load(); }, [load]);

  return (
    <main className="px-8 py-8 text-circuit-text max-w-5xl">
      <header className="mb-6">
        <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest">Quản trị</p>
        <h1 className="font-display text-2xl mt-1 flex items-center gap-2">
          <LayoutGrid size={22} /> Quản lý Phân loại
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
        <>
          {/* Tab bar */}
          <div className="flex border-b border-circuit-line mb-6">
            <TabBtn active={activeTab === "categories"} onClick={() => setActiveTab("categories")}>
              <CornerDownRight size={14} /> Danh mục
            </TabBtn>
            <TabBtn active={activeTab === "brands"} onClick={() => setActiveTab("brands")}>
              Hãng sản xuất
            </TabBtn>
          </div>

          {activeTab === "brands" ? (
            <BrandSection
              brands={brands}
              onCreate={async (name) => { await createBrand(name); await load(); }}
              onUpdate={async (id, name) => { await updateBrand(id, name); await load(); }}
              onDelete={async (id) => { await deleteBrand(id); await load(); }}
              onError={setError}
            />
          ) : (
            <CategorySection
              categories={categories}
              onCreate={async (name, parentId, desc) => { await createCategory(name, parentId, desc); await load(); }}
              onUpdate={async (id, name, parentId, desc) => { await updateCategory(id, name, parentId, desc); await load(); }}
              onDelete={async (id) => { await deleteCategory(id); await load(); }}
              onBannerUpload={async (id, file) => { await uploadCategoryBanner(id, file); await load(); }}
              onError={setError}
            />
          )}
        </>
      )}
    </main>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-circuit-copper text-circuit-copperLight"
          : "border-transparent text-circuit-muted hover:text-circuit-text"
      }`}
    >
      {children}
    </button>
  );
}

// ================= Hãng =================

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
    try { await onCreate(newName.trim()); setNewName(""); }
    catch (err) { onError(err instanceof ApiError ? err.message : "Thêm thất bại"); }
    finally { setBusy(false); }
  }

  async function handleSaveEdit() {
    if (editingId === null) return;
    setBusy(true);
    try { await onUpdate(editingId, editingName.trim()); setEditingId(null); }
    catch (err) { onError(err instanceof ApiError ? err.message : "Cập nhật thất bại"); }
    finally { setBusy(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Xoá hãng này? (không xoá được nếu vẫn còn sản phẩm thuộc hãng)")) return;
    setBusy(true);
    try { await onDelete(id); }
    catch (err) { onError(err instanceof ApiError ? err.message : "Xoá thất bại"); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="rounded-lg border border-circuit-line bg-circuit-panel p-5">
        <h2 className="font-display text-lg text-circuit-text mb-4">Hãng sản xuất</h2>
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
            className="rounded-md bg-circuit-copper px-3 text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <Plus size={16} /> Thêm
          </button>
        </form>

        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {brands.length === 0 && <p className="text-sm text-circuit-muted py-4 text-center">Chưa có hãng nào.</p>}
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
                  <button onClick={handleSaveEdit} disabled={busy} className="text-circuit-signal hover:opacity-80"><Check size={16} /></button>
                  <button onClick={() => setEditingId(null)} className="text-circuit-muted hover:text-red-400"><X size={16} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-circuit-text">{item.name}</span>
                  <button onClick={() => { setEditingId(item.id); setEditingName(item.name); }} className="p-1 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight"><PencilLine size={14} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1 rounded hover:bg-circuit-line text-circuit-muted hover:text-red-400"><Trash2 size={14} /></button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================= Danh mục =================

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
  onCreate: (name: string, parentId?: number, description?: string) => Promise<void>;
  onUpdate: (id: number, name: string, parentId?: number, description?: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onBannerUpload: (id: number, file: File) => Promise<void>;
  onError: (msg: string) => void;
}) {
  // Form state
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState<string>("");
  const [newDescription, setNewDescription] = useState("");
  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingParentId, setEditingParentId] = useState<string>("");
  const [editingDescription, setEditingDescription] = useState("");
  // Expanded state (which nodes have their children visible)
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetId = useRef<number | null>(null);

  const tree = buildTree(categories);

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await onCreate(newName.trim(), newParentId ? Number(newParentId) : undefined, newDescription || undefined);
      setNewName(""); setNewParentId(""); setNewDescription("");
    } catch (err) { onError(err instanceof ApiError ? err.message : "Thêm thất bại"); }
    finally { setBusy(false); }
  }

  function startEdit(cat: CategoryOption) {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setEditingParentId(cat.parent_id?.toString() ?? "");
    setEditingDescription(cat.description ?? "");
    setExpanded((prev) => { const n = new Set(prev); n.add(cat.id); return n; });
  }

  async function handleSaveEdit() {
    if (editingId === null) return;
    setBusy(true);
    try {
      await onUpdate(editingId, editingName.trim(), editingParentId ? Number(editingParentId) : undefined, editingDescription || undefined);
      setEditingId(null);
    } catch (err) { onError(err instanceof ApiError ? err.message : "Cập nhật thất bại"); }
    finally { setBusy(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Xoá danh mục này? (không xoá được nếu còn sản phẩm hoặc danh mục con)")) return;
    setBusy(true);
    try { await onDelete(id); }
    catch (err) { onError(err instanceof ApiError ? err.message : "Xoá thất bại"); }
    finally { setBusy(false); }
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
    try { await onBannerUpload(id, file); }
    catch (err) { onError(err instanceof ApiError ? err.message : "Tải banner thất bại"); }
    finally { setUploadingId(null); e.target.value = ""; }
  }

  function renderNode(node: CategoryNode, depth: number) {
    const isEditing = editingId === node.id;
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="rounded-md">
        {/* Main row */}
        <div
          className={`flex items-center gap-2 px-3 py-2 border rounded-md ${
            isEditing ? "border-circuit-copper/50 bg-circuit-panel/60" : "border-circuit-line hover:border-circuit-copper/50 transition-colors"
          }`}
          style={{ marginLeft: depth * 20 }}
        >
          {/* Expand/collapse for parents */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="text-circuit-muted hover:text-circuit-copperLight shrink-0"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          ) : (
            <span className="w-[14px] shrink-0" />
          )}

          {/* Banner thumbnail */}
          <div
            className="w-8 h-8 shrink-0 rounded bg-circuit-bg/60 overflow-hidden flex items-center justify-center cursor-pointer hover:ring-1 hover:ring-circuit-copper/50"
            onClick={() => triggerBannerUpload(node.id)}
            title="Click để đổi banner"
          >
            {node.banner_image_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={getMediaUrl(node.banner_image_url)} alt="" className="object-cover w-full h-full" />
            ) : (
              uploadingId === node.id ? <Loader2 size={12} className="animate-spin text-circuit-copper" /> : <ImagePlus size={12} className="text-circuit-muted" />
            )}
          </div>

          {isEditing ? (
            /* Edit mode */
            <>
              <div className="flex-1 space-y-1.5">
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full bg-transparent border-b border-circuit-copper text-sm text-circuit-text outline-none"
                  autoFocus
                />
                <textarea
                  value={editingDescription}
                  onChange={(e) => setEditingDescription(e.target.value)}
                  placeholder="Mô tả danh mục (VD: dòng sản phẩm, đối tượng khách hàng...)"
                  rows={2}
                  className="w-full bg-transparent border border-circuit-line rounded px-2 py-1 text-xs text-circuit-muted outline-none focus:border-circuit-copper resize-none"
                />
                <select
                  value={editingParentId}
                  onChange={(e) => setEditingParentId(e.target.value)}
                  className="text-xs rounded border border-circuit-line bg-circuit-bg text-circuit-muted px-1.5 py-1"
                >
                  <option value="">— Cấp gốc —</option>
                  {categories.filter((c) => c.id !== node.id).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button onClick={handleSaveEdit} disabled={busy} className="text-circuit-signal hover:opacity-80 shrink-0"><Check size={16} /></button>
              <button onClick={() => setEditingId(null)} className="text-circuit-muted hover:text-red-400 shrink-0"><X size={16} /></button>
            </>
          ) : (
            /* View mode */
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-circuit-text truncate">{node.name}</p>
                {node.description && (
                  <p className="text-xs text-circuit-muted truncate mt-0.5">{node.description}</p>
                )}
              </div>
              <button
                onClick={() => startEdit(node)}
                className="p-1 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight shrink-0"
                title="Sửa"
              >
                <PencilLine size={14} />
              </button>
              <button
                onClick={() => handleDelete(node.id)}
                className="p-1 rounded hover:bg-circuit-line text-circuit-muted hover:text-red-400 shrink-0"
                title="Xoá"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Add form */}
      <div className="rounded-lg border border-circuit-line bg-circuit-panel p-5 mb-5">
        <h2 className="font-display text-lg text-circuit-text mb-4 flex items-center gap-2">
          <CornerDownRight size={16} /> Thêm danh mục mới
        </h2>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-circuit-muted uppercase mb-1">Tên danh mục *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="VD: Laptop Gaming, Điện thoại..."
                className="w-full rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text outline-none focus:border-circuit-copper"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-circuit-muted uppercase mb-1">Danh mục cha (tuỳ chọn)</label>
              <select
                value={newParentId}
                onChange={(e) => setNewParentId(e.target.value)}
                className="w-full rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text outline-none focus:border-circuit-copper"
              >
                <option value="">— Cấp gốc —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono text-circuit-muted uppercase mb-1 flex items-center gap-1">
              <BookOpen size={11} /> Mô tả chi tiết (tuỳ chọn)
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Mô tả ngắn về danh mục này — VD: Các dòng laptop phục vụ chơi game, cấu hình mạnh, card đồ hoạ rời..."
              rows={2}
              className="w-full rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text outline-none focus:border-circuit-copper resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busy || !newName.trim()}
              className="rounded-md bg-circuit-copper px-4 py-2 text-sm text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus size={15} /> Thêm danh mục
            </button>
          </div>
        </form>
      </div>

      {/* Tree list */}
      <div className="rounded-lg border border-circuit-line bg-circuit-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-circuit-text">
            Tất cả danh mục ({categories.length})
          </h2>
          <p className="text-xs text-circuit-muted">Click ⋎/⋐ để thu gọn/mở rộng nhóm</p>
        </div>

        <div className="space-y-1">
          {tree.length === 0 && (
            <p className="text-sm text-circuit-muted py-6 text-center">Chưa có danh mục nào.</p>
          )}
          {tree.map((node) => renderNode(node, 0))}
        </div>
      </div>
    </div>
  );
}
