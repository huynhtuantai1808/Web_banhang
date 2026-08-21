"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, ImagePlus, Trash2, Check, Camera, Upload } from "lucide-react";
import {
  listProductImages, uploadProductImage, deleteProductImage, setPrimaryImage,
  ProductImageOut,
} from "@/lib/services/products";
import { ApiError } from "@/lib/apiClient";
import { getMediaUrl } from "@/lib/media";

interface ImageManagerModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

export default function ImageManagerModal({
  open,
  onClose,
  productId,
  productName,
}: ImageManagerModalProps) {
  const [images, setImages] = useState<ProductImageOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    listProductImages(productId)
      .then(setImages)
      .catch(() => setError("Không tải được danh sách ảnh"))
      .finally(() => setLoading(false));
  }, [open, productId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadProductImage(
        productId,
        file,
        images.length === 0
      );
      setImages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          product_id: productId,
          url: result.image_url,
          is_primary: prev.length === 0,
        },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tải ảnh thất bại");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSetPrimary(imageId: string) {
    setSettingPrimary(imageId);
    setError(null);
    try {
      await setPrimaryImage(imageId);
      setImages((prev) =>
        prev.map((img) => ({ ...img, is_primary: img.id === imageId }))
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Đặt đại diện thất bại");
    } finally {
      setSettingPrimary(null);
    }
  }

  async function handleDelete(imageId: string) {
    if (!confirm("Xoá ảnh này?")) return;
    setError(null);
    try {
      await deleteProductImage(imageId);
      const deleted = images.find((i) => i.id === imageId);
      const wasPrimary = deleted?.is_primary;
      const remaining = images.filter((i) => i.id !== imageId);
      // Nếu xoá ảnh đại diện và còn ảnh khác → đặt ảnh đầu tiên làm đại diện
      if (wasPrimary && remaining.length > 0) {
        const first = remaining[0];
        await setPrimaryImage(first.id);
        setImages(
          remaining.map((img) => ({ ...img, is_primary: img.id === first.id }))
        );
      } else {
        setImages(remaining);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xoá ảnh thất bại");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-3xl rounded-xl border border-circuit-line bg-circuit-panel shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-circuit-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-circuit-copper/20 flex items-center justify-center">
              <Camera size={20} className="text-circuit-copper" />
            </div>
            <div>
              <h3 className="font-display text-base text-circuit-text">Quản lý hình ảnh</h3>
              <p className="text-xs text-circuit-muted font-mono truncate max-w-xs">{productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-circuit-muted hover:text-circuit-text hover:bg-circuit-line transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="mb-4 rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Upload */}
          <div className="mb-5">
            <label className="inline-flex items-center gap-2 rounded-lg bg-circuit-copper px-5 py-2.5 text-sm font-semibold text-circuit-bg hover:bg-circuit-copperLight transition-colors cursor-pointer shadow-md">
              {uploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ImagePlus size={16} />
              )}
              Tải ảnh lên
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
            <p className="text-xs text-circuit-muted mt-2">
              PNG, JPG, WEBP, GIF · Tối đa 5MB · Ảnh đầu tiên sẽ là ảnh đại diện
            </p>
          </div>

          {/* Image grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-circuit-muted">
              <Loader2 size={24} className="animate-spin mr-2" /> Đang tải ảnh...
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-circuit-line rounded-xl text-center">
              <div className="w-16 h-16 rounded-full bg-circuit-line/50 flex items-center justify-center mb-4">
                <ImagePlus size={28} className="text-circuit-muted" />
              </div>
              <p className="text-sm text-circuit-muted">Chưa có ảnh nào.</p>
              <p className="text-xs text-circuit-muted mt-1">Bấm "Tải ảnh lên" để thêm ảnh đầu tiên.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className={`relative group rounded-xl overflow-hidden border-2 transition-all ${
                    img.is_primary
                      ? "border-circuit-copper shadow-lg shadow-circuit-copper/20"
                      : "border-circuit-line hover:border-circuit-copper/50"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-circuit-bg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getMediaUrl(img.url)}
                      alt=""
                      className="w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>

                  {/* Primary badge */}
                  {img.is_primary && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-circuit-copper text-[10px] font-bold text-circuit-bg uppercase tracking-wide shadow">
                      Đại diện
                    </div>
                  )}

                  {/* Actions overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between">
                    <button
                      onClick={() => !img.is_primary && handleSetPrimary(img.id)}
                      disabled={settingPrimary === img.id || img.is_primary}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        img.is_primary
                          ? "bg-circuit-copper/40 text-circuit-copper cursor-default"
                          : "bg-white/20 text-white hover:bg-circuit-copper hover:text-circuit-bg"
                      }`}
                    >
                      {settingPrimary === img.id ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Check size={11} />
                      )}
                      {img.is_primary ? "Đại diện" : "Đặt đại diện"}
                    </button>
                    <button
                      onClick={() => handleDelete(img.id)}
                      className="flex items-center gap-1 rounded-lg bg-red-500/80 text-white hover:bg-red-500 px-2.5 py-1.5 text-xs font-medium transition-colors"
                    >
                      <Trash2 size={11} /> Xoá
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          {!loading && images.length > 0 && (
            <p className="text-xs text-circuit-muted mt-4 font-mono">
              {images.length} ảnh · {images.filter((i) => i.is_primary).length === 1 ? "1 đại diện" : "chưa có đại diện"}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-circuit-line flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-circuit-line px-5 py-2 text-sm font-medium text-circuit-text hover:bg-circuit-line/80 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
