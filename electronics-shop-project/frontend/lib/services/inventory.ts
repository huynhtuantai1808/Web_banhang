import { apiClient } from "../apiClient";

export interface InventoryItem {
  id: string;
  product_code: string;
  name: string;
  category: string | null;
  brand: string | null;
  price: number;
  discount_price: number | null;
  in_stock: number;
  sold: number;
  total_units: number;
}

export interface InventoryFilters {
  category_id?: number;
  brand_id?: number;
  keyword?: string;
  stock_status?: "in_stock" | "out_of_stock" | "low_stock";
}

/** Danh sách tồn kho - chỉ employee mới xem được. */
export async function listInventory(filters: InventoryFilters = {}): Promise<InventoryItem[]> {
  const { data } = await apiClient.get<InventoryItem[]>("/inventory", { params: filters });
  return data;
}

/** Xuất danh sách tồn kho ra CSV. */
export function exportInventoryToCSV(items: InventoryItem[], filename = "ton_kho.csv") {
  const headers = ["Mã SP", "Tên sản phẩm", "Danh mục", "Hãng", "Giá", "Tồn kho", "Đã bán", "Tổng đơn vị"];
  const rows = items.map((item) => [
    item.product_code,
    item.name,
    item.category ?? "",
    item.brand ?? "",
    item.price.toString(),
    item.in_stock.toString(),
    item.sold.toString(),
    item.total_units.toString(),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
