import { apiClient } from "../apiClient";

export type ShipmentStatus = "pending" | "picked_up" | "in_transit" | "delivered" | "failed" | "returned";

export const SUGGESTED_CARRIERS = [
  "Giao Hàng Nhanh", "Giao Hàng Tiết Kiệm", "Viettel Post", "Ninja Van", "Tự vận chuyển",
];

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: "Chờ lấy hàng",
  picked_up: "Đã lấy hàng",
  in_transit: "Đang vận chuyển",
  delivered: "Đã giao hàng",
  failed: "Giao thất bại",
  returned: "Đã hoàn trả",
};

export interface ShipmentStatusLogOut {
  status: ShipmentStatus;
  note?: string | null;
  created_at: string;
}

export interface ShipmentOut {
  id: string;
  order_id: string;
  carrier: string;
  tracking_code?: string | null;
  status: ShipmentStatus;
  shipping_fee: number;
  note?: string | null;
  created_at: string;
  updated_at: string;
  logs: ShipmentStatusLogOut[];
}

export interface ShipmentCreateInput {
  carrier: string;
  tracking_code?: string;
  shipping_fee?: number;
  note?: string;
}

// ---- Admin ----
export async function createShipment(orderId: string, payload: ShipmentCreateInput): Promise<ShipmentOut> {
  const { data } = await apiClient.post<ShipmentOut>(`/admin/orders/${orderId}/shipment`, payload);
  return data;
}

export async function updateShipmentStatus(
  shipmentId: string,
  status: ShipmentStatus,
  note?: string
): Promise<ShipmentOut> {
  const { data } = await apiClient.put<ShipmentOut>(`/admin/shipments/${shipmentId}/status`, { status, note });
  return data;
}

export async function listAllShipments(): Promise<ShipmentOut[]> {
  const { data } = await apiClient.get<ShipmentOut[]>("/admin/shipments");
  return data;
}

/** Admin xem thông tin vận chuyển của 1 đơn hàng bất kỳ (để hỗ trợ khách) — khác với getMyShipment
 * (dành cho khách hàng xem đơn của chính mình). */
export async function getShipmentForAdmin(orderId: string): Promise<ShipmentOut | null> {
  try {
    const { data } = await apiClient.get<ShipmentOut>(`/admin/orders/${orderId}/shipment`);
    return data;
  } catch {
    return null; // đơn chưa có thông tin vận chuyển
  }
}

// ---- Khách hàng ----
export async function getMyShipment(orderId: string): Promise<ShipmentOut | null> {
  try {
    const { data } = await apiClient.get<ShipmentOut>(`/orders/${orderId}/shipment`);
    return data;
  } catch {
    return null; // đơn chưa có thông tin vận chuyển
  }
}
