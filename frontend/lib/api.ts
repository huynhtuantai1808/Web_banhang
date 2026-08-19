const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

function authHeaders(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Nhập dữ liệu sản phẩm hàng loạt từ file Excel/CSV client chọn. */
export async function importProductsFile(file: File, token: string) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/products/import`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Import thất bại");
  return res.json();
}

/** Tải ảnh sản phẩm lên từ client. */
export async function uploadProductImage(
  productId: string,
  file: File,
  token: string,
  isPrimary = false
) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${API_BASE}/products/${productId}/images?is_primary=${isPrimary}`,
    { method: "POST", headers: authHeaders(token), body: formData }
  );
  if (!res.ok) throw new Error((await res.json()).detail || "Tải ảnh thất bại");
  return res.json();
}
