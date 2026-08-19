"use client";

import { useRef, useState } from "react";
import { Plus, Package, Search, PencilLine, Trash2, Upload, ImagePlus, Loader2 } from "lucide-react";
import { importProductsFile, uploadProductImage } from "@/lib/api";

interface AdminProduct {
  id: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  stock: number;
  status: "active" | "discontinued";
}

const SAMPLE: AdminProduct[] = [
  { id: "1", code: "SP000123", name: "Laptop Gaming ROG Strix G16", brand: "Asus", category: "PC Gaming", price: 42990000, stock: 12, status: "active" },
  { id: "2", code: "SP000124", name: "iPhone 16 Pro Max 256GB", brand: "Apple", category: "Điện thoại", price: 34990000, stock: 5, status: "active" },
  { id: "3", code: "SP000125", name: "iPad Pro M4 11 inch", brand: "Apple", category: "Máy tính bảng", price: 26990000, stock: 0, status: "discontinued" },
];

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

export default function AdminProductsPage() {
  const [products] = useState<AdminProduct[]>(SAMPLE);
  const [keyword, setKeyword] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null);

  const importInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Token nhân viên lấy từ /api/v1/employees/login, lưu sau khi đăng nhập ở trang login riêng.
  // Ở đây đọc tạm từ localStorage để minh hoạ luồng gọi API cần xác thực.
  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("employee_token") || "" : "";

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(keyword.toLowerCase()) || p.code.includes(keyword)
  );

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMessage(null);
    try {
      const result = await importProductsFile(file, getToken());
      setImportMessage(
        `Đã nhập ${result.success_count} sản phẩm.` +
          (result.failed_rows?.length ? ` ${result.failed_rows.length} dòng lỗi.` : "")
      );
    } catch (err: any) {
      setImportMessage(`Lỗi: ${err.message}`);
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function handleUploadImage(productId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImageFor(productId);
    try {
      await uploadProductImage(productId, file, getToken(), true);
      setImportMessage(`Đã tải ảnh cho sản phẩm ${productId} thành công.`);
    } catch (err: any) {
      setImportMessage(`Lỗi tải ảnh: ${err.message}`);
    } finally {
      setUploadingImageFor(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-circuit-bg text-circuit-text px-8 py-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest">Quản trị</p>
          <h1 className="font-display text-2xl mt-1 flex items-center gap-2">
            <Package size={22} /> Quản lý sản phẩm
          </h1>
        </div>
        <div className="flex items-center gap-3">
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

          <button className="flex items-center gap-2 rounded-md bg-circuit-copper px-4 py-2 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors">
            <Plus size={16} /> Thêm sản phẩm
          </button>
        </div>
      </header>

      {importMessage && (
        <div className="mb-6 rounded-md border border-circuit-line bg-circuit-panel px-4 py-3 text-sm text-circuit-signal">
          {importMessage}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-full border border-circuit-line bg-circuit-panel px-4 py-2 mb-6 max-w-sm">
        <Search size={16} className="text-circuit-muted" />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo tên hoặc mã sản phẩm..."
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-circuit-muted"
        />
      </div>

      <div className="rounded-lg border border-circuit-line overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-circuit-panel text-circuit-muted font-mono text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Mã SP</th>
              <th className="text-left px-4 py-3">Tên sản phẩm</th>
              <th className="text-left px-4 py-3">Hãng</th>
              <th className="text-left px-4 py-3">Danh mục</th>
              <th className="text-right px-4 py-3">Giá</th>
              <th className="text-right px-4 py-3">Tồn kho</th>
              <th className="text-left px-4 py-3">Trạng thái</th>
              <th className="text-right px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-circuit-line hover:bg-circuit-panel/60">
                <td className="px-4 py-3 font-mono text-circuit-copperLight">{p.code}</td>
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3 text-circuit-muted">{p.brand}</td>
                <td className="px-4 py-3 text-circuit-muted">{p.category}</td>
                <td className="px-4 py-3 text-right">{formatVND(p.price)}</td>
                <td className={`px-4 py-3 text-right ${p.stock === 0 ? "text-red-400" : "text-circuit-signal"}`}>
                  {p.stock}
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
                  <div className="flex justify-end gap-2">
                    <label className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight cursor-pointer">
                      {uploadingImageFor === p.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <ImagePlus size={16} />
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => handleUploadImage(p.id, e)}
                      />
                    </label>
                    <button className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight">
                      <PencilLine size={16} />
                    </button>
                    <button className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-red-400">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
