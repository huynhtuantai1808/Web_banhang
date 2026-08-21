import { apiClient } from "../apiClient";

export interface ProductOut {
  id: string;
  product_code: string;
  name: string;
  description?: string | null;
  long_description?: string | null;
  video_url?: string | null;
  brand?: string | null;
  category?: string | null;
  color?: string | null;
  material?: string | null;
  size_dimension?: string | null;
  specification?: Record<string, unknown> | null;
  price: number;
  discount_price?: number | null;
  is_installment_eligible: boolean;
  status: string;
  primary_image_url?: string | null;
  average_rating?: number | null;
  review_count?: number | null;
}

export interface ProductInput {
  product_code: string;
  name: string;
  description?: string;
  long_description?: string;
  video_url?: string;
  brand?: string;
  brand_id?: number;
  category?: string;
  category_id?: number;
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
  category_id?: number;
  feature?: string;
  on_sale?: boolean;
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

export interface ReviewOut {
  id: number;
  product_id: string;
  customer_id: string;
  customer_name: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface ReviewCreate {
  rating: number;
  comment?: string;
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

export async function setPrimaryImage(imageId: string): Promise<void> {
  await apiClient.put(`/products/images/${imageId}/primary`);
}

// ---- Reviews ----
export async function getProductReviews(productId: string, page = 1): Promise<ReviewOut[]> {
  const { data } = await apiClient.get<ReviewOut[]>(`/products/${productId}/reviews`, {
    params: { page, page_size: 10 },
  });
  return data;
}

export async function submitReview(productId: string, payload: ReviewCreate): Promise<ReviewOut> {
  const { data } = await apiClient.post<ReviewOut>(`/products/${productId}/reviews`, payload);
  return data;
}

// ---- Related products ----
export async function getRelatedProducts(productId: string, limit = 8): Promise<ProductOut[]> {
  const { data } = await apiClient.get<ProductOut[]>(`/products/${productId}/related`, {
    params: { limit },
  });
  return data;
}

/** Danh sách hãng hiện có — dùng để gợi ý (datalist) khi nhập sản phẩm mới. */
export async function listBrands(): Promise<CatalogOption[]> {
  const { data } = await apiClient.get<CatalogOption[]>("/brands");
  return data;
}

/** Danh sách danh mục hiện có — dùng để gợi ý (datalist) khi nhập sản phẩm mới. */
export async function listCategories(): Promise<CategoryOption[]> {
  const { data } = await apiClient.get<CategoryOption[]>("/categories");
  return data;
}

// ---- CRUD hãng/danh mục (admin) ----
export async function createBrand(name: string): Promise<CatalogOption> {
  const { data } = await apiClient.post<CatalogOption>("/brands", { name });
  return data;
}

export async function updateBrand(id: number, name: string): Promise<CatalogOption> {
  const { data } = await apiClient.put<CatalogOption>(`/brands/${id}`, { name });
  return data;
}

export async function deleteBrand(id: number): Promise<void> {
  await apiClient.delete(`/brands/${id}`);
}

export interface CategoryOption extends CatalogOption {
  slug: string;
  parent_id?: number | null;
  description?: string | null;
  banner_image_url?: string | null;
}

export async function createCategory(name: string, parentId?: number, description?: string): Promise<CategoryOption> {
  const { data } = await apiClient.post<CategoryOption>("/categories", { name, parent_id: parentId, description });
  return data;
}

export async function updateCategory(id: number, name: string, parentId?: number, description?: string): Promise<CategoryOption> {
  const { data } = await apiClient.put<CategoryOption>(`/categories/${id}`, { name, parent_id: parentId, description });
  return data;
}

export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}

export async function uploadCategoryBanner(id: number, file: File): Promise<CategoryOption> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<CategoryOption>(`/categories/${id}/banner-image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
