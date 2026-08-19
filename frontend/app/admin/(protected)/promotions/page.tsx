"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Tag, Loader2, PencilLine, Ban, UserPlus, Percent, Trash2 } from "lucide-react";
import { listPromotions, deactivatePromotion, PromotionOut } from "@/lib/services/promotions";
import { listDiscountRules, deleteDiscountRule, DiscountRuleOut } from "@/lib/services/discountRules";
import { ApiError } from "@/lib/apiClient";
import PromotionFormModal from "@/components/admin/PromotionFormModal";
import AssignPromotionModal from "@/components/admin/AssignPromotionModal";
import DiscountRuleFormModal from "@/components/admin/DiscountRuleFormModal";

function formatValue(p: PromotionOut) {
  return p.discount_type === "percent" ? `${p.discount_value}%` : `${p.discount_value.toLocaleString("vi-VN")}₫`;
}

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionOut | null>(null);
  const [assignTarget, setAssignTarget] = useState<PromotionOut | null>(null);

  const [discountRules, setDiscountRules] = useState<DiscountRuleOut[]>([]);
  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DiscountRuleOut | null>(null);

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPromotions(await listPromotions());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được danh sách khuyến mãi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
    listDiscountRules().then(setDiscountRules).catch(() => setDiscountRules([]));
  }, [fetchPromotions]);

  async function handleDeleteRule(id: string) {
    if (!confirm("Xoá quy tắc chiết khấu này?")) return;
    try {
      await deleteDiscountRule(id);
      setDiscountRules(await listDiscountRules());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xoá thất bại");
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Ngừng áp dụng mã khuyến mãi này?")) return;
    try {
      await deactivatePromotion(id);
      await fetchPromotions();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Thao tác thất bại");
    }
  }

  return (
    <main className="px-8 py-8 text-circuit-text">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest">Quản trị</p>
          <h1 className="font-display text-2xl mt-1 flex items-center gap-2">
            <Tag size={22} /> Khuyến mãi / Chiết khấu
          </h1>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="flex items-center gap-2 rounded-md bg-circuit-copper px-4 py-2 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors"
        >
          <Plus size={16} /> Tạo mã khuyến mãi
        </button>
      </header>

      {error && (
        <div className="mb-6 rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-circuit-line overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-circuit-panel text-circuit-muted font-mono text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Mã</th>
              <th className="text-left px-4 py-3">Tên chương trình</th>
              <th className="text-left px-4 py-3">Giá trị</th>
              <th className="text-left px-4 py-3">Phạm vi</th>
              <th className="text-left px-4 py-3">Đã dùng</th>
              <th className="text-left px-4 py-3">Trạng thái</th>
              <th className="text-right px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-circuit-muted">
                  <Loader2 className="inline animate-spin mr-2" size={16} /> Đang tải...
                </td>
              </tr>
            ) : promotions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-circuit-muted">
                  Chưa có mã khuyến mãi nào.
                </td>
              </tr>
            ) : (
              promotions.map((p) => (
                <tr key={p.id} className="border-t border-circuit-line hover:bg-circuit-panel/60">
                  <td className="px-4 py-3 font-mono text-circuit-copperLight">{p.code}</td>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3">{formatValue(p)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        p.is_targeted ? "bg-circuit-copper/15 text-circuit-copperLight" : "bg-circuit-line text-circuit-muted"
                      }`}
                    >
                      {p.is_targeted ? "Riêng theo khách hàng" : "Công khai"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-circuit-muted">
                    {p.used_count}{p.max_usage ? ` / ${p.max_usage}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        p.is_active ? "bg-circuit-signal/15 text-circuit-signal" : "bg-circuit-muted/15 text-circuit-muted"
                      }`}
                    >
                      {p.is_active ? "Đang áp dụng" : "Đã ngừng"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setAssignTarget(p)}
                        title="Phân bổ theo khách hàng"
                        className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight"
                      >
                        <UserPlus size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                        className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight"
                      >
                        <PencilLine size={16} />
                      </button>
                      {p.is_active && (
                        <button
                          onClick={() => handleDeactivate(p.id)}
                          className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-red-400"
                        >
                          <Ban size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PromotionFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={fetchPromotions}
        editing={editing}
      />
      <AssignPromotionModal
        open={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        promotion={assignTarget}
      />

      {/* ===== Chiết khấu tự động theo hãng/danh mục/số lượng ===== */}
      <header className="flex items-center justify-between mt-10 mb-6">
        <div>
          <h2 className="font-display text-xl flex items-center gap-2">
            <Percent size={20} /> Chiết khấu tự động
          </h2>
          <p className="text-xs text-circuit-muted mt-1">
            Áp dụng ngay khi khách mua đủ số lượng — không cần nhập mã.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingRule(null);
            setRuleFormOpen(true);
          }}
          className="flex items-center gap-2 rounded-md border border-circuit-line px-4 py-2 text-sm text-circuit-text hover:border-circuit-copper hover:text-circuit-copperLight transition-colors"
        >
          <Plus size={16} /> Tạo quy tắc
        </button>
      </header>

      <div className="rounded-lg border border-circuit-line overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-circuit-panel text-circuit-muted font-mono text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Hãng</th>
              <th className="text-left px-4 py-3">Danh mục</th>
              <th className="text-left px-4 py-3">SL tối thiểu</th>
              <th className="text-left px-4 py-3">Giảm giá</th>
              <th className="text-right px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {discountRules.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-circuit-muted">
                  Chưa có quy tắc chiết khấu tự động nào.
                </td>
              </tr>
            ) : (
              discountRules.map((r) => (
                <tr key={r.id} className="border-t border-circuit-line hover:bg-circuit-panel/60">
                  <td className="px-4 py-3">{r.brand_name || "—"}</td>
                  <td className="px-4 py-3">{r.category_name || "—"}</td>
                  <td className="px-4 py-3 text-circuit-muted">{r.min_quantity}</td>
                  <td className="px-4 py-3 text-circuit-signal">{r.discount_percent}%</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingRule(r);
                          setRuleFormOpen(true);
                        }}
                        className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-circuit-copperLight"
                      >
                        <PencilLine size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(r.id)}
                        className="p-1.5 rounded hover:bg-circuit-line text-circuit-muted hover:text-red-400"
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

      <DiscountRuleFormModal
        open={ruleFormOpen}
        onClose={() => setRuleFormOpen(false)}
        onSaved={() => listDiscountRules().then(setDiscountRules)}
        editing={editingRule}
      />
    </main>
  );
}
