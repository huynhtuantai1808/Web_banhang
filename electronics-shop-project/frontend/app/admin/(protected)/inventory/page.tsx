"use client";

import { useCallback, useEffect, useState } from "react";
import { PackageSearch, Loader2, Download, TrendingUp, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { listInventory, exportInventoryToCSV, InventoryItem, InventoryFilters } from "@/lib/services/inventory";
import { listBrands, listCategories } from "@/lib/services/products";
import { ApiError } from "@/lib/apiClient";

function formatVND(v: number) {
  return v.toLocaleString("vi-VN") + "₫";
}

const STOCK_STATUS_TABS = [
  { key: "", label: "Tất cả", icon: PackageSearch },
  { key: "in_stock", label: "Còn hàng", icon: CheckCircle },
  { key: "low_stock", label: "Sắp hết", icon: AlertCircle },
  { key: "out_of_stock", label: "Hết hàng", icon: XCircle },
];

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [brandId, setBrandId] = useState<number | undefined>();
  const [stockStatus, setStockStatus] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: InventoryFilters = {};
      if (categoryId) filters.category_id = categoryId;
      if (brandId) filters.brand_id = brandId;
      if (stockStatus) filters.stock_status = stockStatus as "in_stock" | "out_of_stock" | "low_stock";

      const [invData, brandData, catData] = await Promise.all([
        listInventory(filters),
        listBrands(),
        listCategories(),
      ]);
      setItems(invData);
      setBrands(brandData);
      setCategories(catData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được dữ liệu tồn kho");
    } finally {
      setLoading(false);
    }
  }, [categoryId, brandId, stockStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleExport() {
    exportInventoryToCSV(items, `ton_kho_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  // Summary stats
  const totalProducts = items.length;
  const totalInStock = items.reduce((sum, i) => sum + i.in_stock, 0);
  const totalSold = items.reduce((sum, i) => sum + i.sold, 0);
  const outOfStock = items.filter((i) => i.in_stock === 0).length;
  const lowStock = items.filter((i) => i.in_stock > 0 && i.in_stock <= 5).length;

  return (
    <main className="px-8 py-8 text-circuit-text">
      <header className="mb-6">
        <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest">Quản trị</p>
        <h1 className="font-display text-2xl mt-1 flex items-center gap-2">
          <PackageSearch size={22} /> Quản lý Tồn kho
        </h1>
      </header>

      {error && (
        <div className="mb-6 rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <SummaryCard label="Tổng sản phẩm" value={totalProducts} color="text-circuit-copperLight" />
        <SummaryCard label="Tổng tồn kho" value={totalInStock} color="text-circuit-signal" />
        <SummaryCard label="Tổng đã bán" value={totalSold} color="text-green-400" />
        <SummaryCard label="Sắp hết hàng" value={lowStock} color="text-yellow-400" />
        <SummaryCard label="Hết hàng" value={outOfStock} color="text-red-400" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={categoryId ?? ""}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
          className="rounded-md border border-circuit-line bg-circuit-panel px-3 py-2 text-sm text-circuit-text"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={brandId ?? ""}
          onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : undefined)}
          className="rounded-md border border-circuit-line bg-circuit-panel px-3 py-2 text-sm text-circuit-text"
        >
          <option value="">Tất cả hãng</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button
          onClick={handleExport}
          disabled={items.length === 0}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-md border border-circuit-copper text-circuit-copperLight hover:bg-circuit-copper hover:text-circuit-bg text-sm transition-colors disabled:opacity-50"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Stock Status Tabs */}
      <div className="flex gap-2 mb-4 border-b border-circuit-line pb-3">
        {STOCK_STATUS_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setStockStatus(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                stockStatus === tab.key
                  ? "border-circuit-copper bg-circuit-copper/15 text-circuit-copperLight"
                  : "border-circuit-line text-circuit-muted hover:border-circuit-copper/50"
              }`}
            >
              <Icon size={12} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Inventory Table */}
      <div className="rounded-lg border border-circuit-line overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-circuit-panel text-circuit-muted font-mono text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Mã SP</th>
              <th className="text-left px-4 py-3">Tên sản phẩm</th>
              <th className="text-left px-4 py-3">Danh mục</th>
              <th className="text-left px-4 py-3">Hãng</th>
              <th className="text-right px-4 py-3">Giá</th>
              <th className="text-center px-4 py-3">Tồn kho</th>
              <th className="text-center px-4 py-3">Đã bán</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-circuit-muted">
                <Loader2 className="inline animate-spin mr-2" size={16} /> Đang tải...
              </td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-circuit-muted">Không có sản phẩm nào.</td></tr>
            ) : (
              items.map((item) => {
                const stockLevel = item.in_stock === 0 ? "out" : item.in_stock <= 5 ? "low" : "ok";
                return (
                  <tr key={item.id} className="border-t border-circuit-line hover:bg-circuit-panel/60">
                    <td className="px-4 py-3 font-mono text-xs text-circuit-copperLight">{item.product_code}</td>
                    <td className="px-4 py-3 text-circuit-text">{item.name}</td>
                    <td className="px-4 py-3 text-circuit-muted text-xs">{item.category ?? "—"}</td>
                    <td className="px-4 py-3 text-circuit-muted text-xs">{item.brand ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {item.discount_price ? (
                        <span>
                          <span className="text-circuit-signal">{formatVND(item.discount_price)}</span>
                          <span className="text-xs text-circuit-muted ml-1 line-through">{formatVND(item.price)}</span>
                        </span>
                      ) : (
                        <span className="text-circuit-signal">{formatVND(item.price)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono ${
                        stockLevel === "out" ? "bg-red-400/15 text-red-400" :
                        stockLevel === "low" ? "bg-yellow-400/15 text-yellow-400" :
                        "bg-green-400/15 text-green-400"
                      }`}>
                        {item.in_stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-circuit-muted">{item.sold}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-circuit-line bg-circuit-panel p-4">
      <p className="text-xs text-circuit-muted font-mono uppercase">{label}</p>
      <p className={`text-2xl font-display mt-1 ${color}`}>{value.toLocaleString("vi-VN")}</p>
    </div>
  );
}
