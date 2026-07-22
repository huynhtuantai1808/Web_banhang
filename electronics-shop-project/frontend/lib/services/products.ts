import { apiClient } from "../apiClient";

export interface ProductOut {
  id: string;
  product_code: string;
  name: string;
  description?: string | null;
  brand?: string | null;       // tên hãng (BE tự tạo mới nếu chưa tồn tại khi ghi)
  category?: string | null;    // tên danh mục (BE tự tạo mới nếu chưa tồn tại khi ghi)
  color?: string | null;
  material?: string | null;
  size_dimension?: string | null;
  specification?: Record<string, unknown> | null;
  price: number;
  discount_price?: number | null;
  is_installment_eligible: boolean;
  status: string;
  primary_image_url?: string | null;
}

export interface ProductInput {
  product_code: string;
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  color?: string;
  material?: string;
  size_dimension?: string;
  specification?: Record<string, unknown>;
  price: number;
  discount_price?: number;
  is_installment_eligible?: boolean;
}

export interface ProductFilters {
  keyword?: string;
  brand?: string;
  category?: string;
  feature?: string;
  min_price?: number;
  max_price?: number;
  page?: number;
  page_size?: number;
}

export interface ProductImageOut {
  id: string;
  product_id: string;
  url: string;
  is_primary: boolean;
}

export interface ImportResult {
  message: string;
  success_count: number;
  failed_rows: { row: number; error: string }[];
}

export interface CatalogOption {
  id: number;
  name: string;
}

/** Lấy danh sách sản phẩm, có thể lọc theo hãng/danh mục/giá + từ khoá tìm kiếm. */
export async function listProducts(filters: ProductFilters = {}): Promise<ProductOut[]> {
  const { data } = await apiClient.get<ProductOut[]>("/products", { params: filters });
  return data;
}

export async function getProduct(productId: string): Promise<ProductOut> {
  const { data } = await apiClient.get<ProductOut>(`/products/${productId}`);
  return data;
}

export async function createProduct(payload: ProductInput): Promise<ProductOut> {
  const { data } = await apiClient.post<ProductOut>("/products", payload);
  return data;
}

export async function updateProduct(productId: string, payload: ProductInput): Promise<ProductOut> {
  const { data } = await apiClient.put<ProductOut>(`/products/${productId}`, payload);
  return data;
}

export async function deleteProduct(productId: string): Promise<void> {
  await apiClient.delete(`/products/${productId}`);
}

/** Nhập dữ liệu sản phẩm hàng loạt từ file Excel/CSV client chọn. */
export async function importProductsFile(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<ImportResult>("/products/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

/** Tải ảnh sản phẩm lên từ client. */
export async function uploadProductImage(
  productId: string,
  file: File,
  isPrimary = false
): Promise<{ message: string; image_url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post(`/products/${productId}/images`, formData, {
    params: { is_primary: isPrimary },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function listProductImages(productId: string): Promise<ProductImageOut[]> {
  const { data } = await apiClient.get<ProductImageOut[]>(`/products/${productId}/images`);
  return data;
}

export async function deleteProductImage(imageId: string): Promise<void> {
  await apiClient.delete(`/products/images/${imageId}`);
}

/** Danh sách hãng hiện có — dùng để gợi ý (datalist) khi nhập sản phẩm mới. */
export async function listBrands(): Promise<CatalogOption[]> {
  const { data } = await apiClient.get<CatalogOption[]>("/brands");
  return data;
}

/** Danh sách danh mục hiện có — dùng để gợi ý (datalist) khi nhập sản phẩm mới. */
export async function listCategories(): Promise<CatalogOption[]> {
  const { data } = await apiClient.get<CatalogOption[]>("/categories");
  return data;
}
