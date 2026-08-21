"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus, Package, Search, PencilLine, Trash2, Upload, Loader2, RefreshCw, Camera,
} from "lucide-react";
import {
  listProducts, importProductsFile, deleteProduct, ProductOut,
} from "@/lib/services/products";
import { ApiError } from "@/lib/apiClient";
import { getMediaUrl } from "@/lib/media";
import ProductFormModal from "@/components/admin/ProductFormModal";
import ImageManagerModal from "@/components/admin/ImageManagerModal";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductOut[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductOut | null>(null);
  const [imageManagerFor, setImageManagerFor] = useState<ProductOut | null>(null);

  const importInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = useCallback(async (kw?: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listProducts(kw ? { keyword: kw } : {});
      setProducts(data);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Không tải được danh sách sản phẩm");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  function openCreateModal() {
    setEditingProduct(null);
    setModalOpen(true);
  }

  function openEditModal(product: ProductOut) {
    setEditingProduct(product);
    setModalOpen(true);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setBanner(null);
    try {
      const result = await importProductsFile(file);
      setBanner({
        type: "success",
        text:
          `Đã nhập ${result.success_count} sản phẩm.` +
          (result.failed_rows?.length ? ` ${result.failed_rows.length} dòng lỗi.` : ""),
      });
      await fetchProducts(keyword);
    } catch (err) {
      setBanner({ type: "error", text: err instanceof ApiError ? err.message : "Import thất bại" });
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function handleDelete(productId: string) {
    if (!confirm("Ngừng bán sản phẩm này?")) return;
    try {
      await deleteProduct(productId);
      await fetchProducts(keyword);
    } catch (err) {
      setBanner({ type: "error", text: err instanceof ApiError ? err.message : "Xoá thất bại" });
    }
  }

  return (
    <main className="px-8 py-8 text-circuit-text">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest">Quản trị</p>
          <h1 className="font-display text-2xl mt-1 flex items-center gap-2">
            <Package size={22} /> Quản lý sản phẩm
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchProducts(keyword)}
            className="p-2 rounded-md border border-circuit-line hover:border-circuit-copper text-circuit-muted hover:text-circuit-copperLight transition-colors"
            title="Tải lại"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 rounded-md border border-circuit-line px-4 py-2 text-sm font-medium text-circuit-text hover:border-circuit-copper hover:text-circuit-copperLight transition-colors disabled:opacity-50"
          >
            {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Nhập file Excel/CSV
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleImportFile}
            className="hidden"
          />

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-md bg-circuit-copper px-4 py-2 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors"
          >
            <Plus size={16} /> Thêm sản phẩm
          </button>
        </div>
      </header>

      {banner && (
        <div
          className={`mb-6 rounded-md border px-4 py-3 text-sm ${
            banner.type === "success"
              ? "border-circuit-line bg-circuit-panel text-circuit-signal"
              : "border-red-400/40 bg-red-400/10 text-red-300"
          }`}
        >
          {banner.text}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-full border border-circuit-line bg-circuit-panel px-4 py-2 mb-6 max-w-sm">
        <Search size={16} className="text-circuit-muted" />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchProducts(keyword)}
          placeholder="Tìm theo tên sản phẩm, nhấn Enter..."
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-circuit-muted"
        />
      </div>

      {loadError && (
        <div className="mb-6 rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {loadError}
        </div>
      )}

      <div className="rounded-lg border border-circuit-line overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-circuit-panel text-circuit-muted font-mono text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Ảnh</th>
              <th className="text-left px-4 py-3">Mã SP</th>
              <th className="text-left px-4 py-3">Tên sản phẩm</th>
              <th className="text-left px-4 py-3">Hãng</th>
              <th className="text-left px-4 py-3">Danh mục</th>
              <th className="text-right px-4 py-3">Giá</th>
              <th className="text-right px-4 py-3">Giá KM</th>
              <th className="text-left px-4 py-3">Trạng thái</th>
              <th className="text-right px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-circuit-muted">
                  <Loader2 className="inline animate-spin mr-2" size={16} /> Đang tải dữ liệu từ Backend...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-circuit-muted">
                  Chưa có sản phẩm nào. Bấm "Thêm sản phẩm" hoặc "Nhập file Excel/CSV" để bắt đầu.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-t border-circuit-line hover:bg-circuit-panel/60">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setImageManagerFor(p)}
                      className="relative w-12 h-12 rounded-lg border border-circuit-line overflow-hidden bg-circuit-bg hover:border-circuit-copper transition-colors group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getMediaUrl(p.primary_image_url) || "/placeholder-product.png"}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-product.png"; }}
                      />
                      {/* Camera overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                        <Camera size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-circuit-copperLight">{p.product_code}</td>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3 text-circuit-muted">{p.brand || "—"}</td>
                  <td className="px-4 py-3 text-circuit-muted">{p.category || "—"}</td>
                  <td className="px-4 py-3 text-right">{formatVND(p.price)}</td>
                  <td className="px-4 py-3 text-right text-circuit-signal">
                    {p.discount_price ? formatVND(p.discount_price) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        p.status === "active"
                          ? "bg-circuit-signal/15 text-circuit-signal"
                          : "bg-circuit-muted/15 text-circuit-muted"
                      }`}
                    >
                      {p.status === "active" ? "Đang bán" : "Ngừng bán"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setImageManagerFor(p)}
                        title="Quản lý ảnh"
                        className="p-2 rounded-lg hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight transition-colors"
                      >
                        <Camera size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(p)}
                        title="Sửa sản phẩm"
                        className="p-2 rounded-lg hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight transition-colors"
                      >
                        <PencilLine size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        title="Ngừng bán"
                        className="p-2 rounded-lg hover:bg-circuit-line text-circuit-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ProductFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => fetchProducts(keyword)}
        editingProduct={editingProduct}
      />

      <ImageManagerModal
        open={!!imageManagerFor}
        onClose={() => setImageManagerFor(null)}
        productId={imageManagerFor?.id ?? ""}
        productName={imageManagerFor?.name ?? ""}
      />
    </main>
  );
}
