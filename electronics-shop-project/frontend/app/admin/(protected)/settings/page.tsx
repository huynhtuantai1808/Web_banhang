"use client";

import { useEffect, useRef, useState } from "react";
import { Palette, Loader2, Image as ImageIcon, Upload, Plus, Trash2 } from "lucide-react";
import {
  getSiteSettings, updateSiteSettings, uploadBannerImage, uploadLogoImage, uploadGeneralImage, SiteSettingsOut,
} from "@/lib/services/settings";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { getMediaUrl } from "@/lib/media";
import { ApiError } from "@/lib/apiClient";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettingsOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQuickLinkIdx, setUploadingQuickLinkIdx] = useState<number | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { refresh } = useSiteSettings();

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getSiteSettings();
        setSettings(data);
      } catch (err: any) {
        setBanner({ type: "error", text: err instanceof ApiError ? String(err.message) : (err?.message ? String(err.message) : "Không tải được cấu hình") });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function update<K extends keyof SiteSettingsOut>(key: K, value: SiteSettingsOut[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
setBanner(null);

    try {
      const updated = await updateSiteSettings({
        site_name: settings.site_name,
        hero_title: settings.hero_title,
        hero_subtitle: settings.hero_subtitle,
        hero_description: settings.hero_description,
        footer_intro: settings.footer_intro ?? undefined,
        accent_color: settings.accent_color,
        quick_links: settings.quick_links,
      });
      setSettings(updated);
      await refresh();
      setBanner({ type: "success", text: "Đã lưu cấu hình giao diện. Tải lại trang chủ để xem thay đổi." });
    } catch (err: any) {
      setBanner({ type: "error", text: err instanceof ApiError ? String(err.message) : (err?.message ? String(err.message) : "Lưu thất bại") });
    } finally {
      setSaving(false);
    }
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    setBanner(null);
    try {
      const updated = await uploadBannerImage(file);
      setSettings(updated);
      setBanner({ type: "success", text: "Đã cập nhật ảnh banner." });
    } catch (err: any) {
      setBanner({ type: "error", text: err instanceof ApiError ? String(err.message) : (err?.message ? String(err.message) : "Tải ảnh thất bại") });
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setBanner(null);
    try {
      const updated = await uploadLogoImage(file);
      setSettings(updated);
      setBanner({ type: "success", text: "Đã cập nhật logo." });
    } catch (err: any) {
      setBanner({ type: "error", text: err instanceof ApiError ? String(err.message) : (err?.message ? String(err.message) : "Tải logo thất bại") });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  if (loading || !settings) {
    return (
      <main className="px-8 py-8 text-circuit-muted flex items-center justify-center">
        <Loader2 className="animate-spin mr-2" size={18} /> Đang tải cấu hình...
      </main>
    );
  }

  return (
    <main className="px-8 py-8 text-circuit-text max-w-3xl">
      <header className="mb-6">
        <p className="font-mono text-xs text-circuit-copperLight uppercase tracking-widest">Quản trị</p>
        <h1 className="font-display text-2xl mt-1 flex items-center gap-2">
          <Palette size={22} /> Tuỳ chỉnh giao diện Storefront
        </h1>
        <p className="text-sm text-circuit-muted mt-2">
          Thay đổi tại đây sẽ áp dụng ngay cho trang chủ khách hàng nhìn thấy (
          <code className="text-circuit-copperLight">/</code>) — tên shop, tiêu đề banner, mô tả,
          ảnh nền, logo và màu chủ đạo của toàn bộ giao diện.
        </p>
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

      <div className="space-y-6">
        <Field label="Tên shop (hiển thị ở logo)">
          <input
            value={settings.site_name}
            onChange={(e) => update("site_name", e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Nhãn nhỏ phía trên tiêu đề banner (VD: '// TechTrace Store')">
          <input
            value={settings.hero_subtitle}
            onChange={(e) => update("hero_subtitle", e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Tiêu đề banner chính">
          <input
            value={settings.hero_title}
            onChange={(e) => update("hero_title", e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Mô tả dưới tiêu đề">
          <textarea
            value={settings.hero_description}
            onChange={(e) => update("hero_description", e.target.value)}
            className="input min-h-[80px]"
          />
        </Field>

        <Field label="Phần giới thiệu footer (hiển thị ở cuối trang)">
          <textarea
            value={settings.footer_intro || ""}
            onChange={(e) => update("footer_intro", e.target.value)}
            className="input min-h-[80px]"
            placeholder="VD: TechTrace là cửa hàng công nghệ hàng đầu..."
          />
        </Field>

        <Field label="Màu chủ đạo (áp dụng cho nút, điểm nhấn toàn giao diện)">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={settings.accent_color}
              onChange={(e) => update("accent_color", e.target.value)}
              className="h-10 w-16 rounded border border-circuit-line bg-transparent cursor-pointer"
            />
            <input
              value={settings.accent_color}
              onChange={(e) => update("accent_color", e.target.value)}
              className="input flex-1"
              placeholder="#C87F45"
            />
          </div>
        </Field>

        {/* Ảnh banner */}
        <div>
          <span className="block text-xs font-mono text-circuit-muted uppercase mb-2">
            Ảnh nền banner (hero)
          </span>
          <div className="flex items-center gap-4">
            <div className="w-32 h-20 rounded-md border border-circuit-line bg-circuit-panel overflow-hidden flex items-center justify-center shrink-0">
              {settings.banner_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getMediaUrl(settings.banner_image_url)}
                  alt="banner"
                  className="object-cover w-full h-full"
                />
              ) : (
                <ImageIcon size={20} className="text-circuit-muted" />
              )}
            </div>
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
              className="flex items-center gap-2 rounded-md border border-circuit-line px-4 py-2 text-sm text-circuit-text hover:border-circuit-copper hover:text-circuit-copperLight transition-colors disabled:opacity-50"
            >
              {uploadingBanner ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Tải ảnh banner
            </button>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleBannerUpload}
            />
          </div>
        </div>

        {/* Logo */}
        <div>
          <span className="block text-xs font-mono text-circuit-muted uppercase mb-2">Logo riêng</span>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-md border border-circuit-line bg-circuit-panel overflow-hidden flex items-center justify-center shrink-0">
              {settings.logo_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getMediaUrl(settings.logo_image_url)}
                  alt="logo"
                  className="object-contain w-full h-full p-2"
                />
              ) : (
                <ImageIcon size={20} className="text-circuit-muted" />
              )}
            </div>
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="flex items-center gap-2 rounded-md border border-circuit-line px-4 py-2 text-sm text-circuit-text hover:border-circuit-copper hover:text-circuit-copperLight transition-colors disabled:opacity-50"
            >
              {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Tải logo
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="pt-4 border-t border-circuit-line">
          <span className="block text-xs font-mono text-circuit-muted uppercase mb-4">Danh mục truy cập nhanh (Trang chủ)</span>
          <div className="space-y-3 mb-3">
            {(settings.quick_links || []).map((ql, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-circuit-panel p-3 rounded-md border border-circuit-line">
                <div className="w-10 h-10 shrink-0 bg-gray-100 rounded overflow-hidden flex items-center justify-center border border-circuit-line relative group">
                  {ql.image_url ? (
                    <img src={getMediaUrl(ql.image_url)} alt="icon" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon size={16} className="text-gray-400" />
                  )}
                  {uploadingQuickLinkIdx === idx ? (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 size={16} className="animate-spin text-white" />
                    </div>
                  ) : (
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                      <Upload size={14} className="text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingQuickLinkIdx(idx);
                          try {
                            const res = await uploadGeneralImage(file);
                            const newLinks = [...(settings.quick_links || [])];
                            newLinks[idx] = { ...newLinks[idx], image_url: res.url };
                            update("quick_links", newLinks);
                          } catch (err) {
                            alert("Upload ảnh thất bại");
                          } finally {
                            setUploadingQuickLinkIdx(null);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-2 w-full">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={ql.name || ""}
                      onChange={(e) => {
                        const newLinks = [...(settings.quick_links || [])];
                        newLinks[idx] = { ...newLinks[idx], name: e.target.value };
                        update("quick_links", newLinks);
                      }}
                      className="input flex-1 min-w-[150px]"
                      placeholder="Tên danh mục (VD: iPhone 17)"
                    />
                  <select
                    value={ql.icon || "Smartphone"}
                    onChange={(e) => {
                      const newLinks = [...(settings.quick_links || [])];
                      newLinks[idx] = { ...newLinks[idx], icon: e.target.value };
                      update("quick_links", newLinks);
                    }}
                    className="input w-40 cursor-pointer shrink-0"
                  >
                    <option value="Smartphone">Điện thoại</option>
                    <option value="Laptop">Laptop</option>
                    <option value="Tablet">Tablet / iPad</option>
                    <option value="Watch">Đồng hồ</option>
                    <option value="Headphones">Tai nghe / Loa</option>
                    <option value="Camera">Camera</option>
                    <option value="HardDrive">Lưu trữ</option>
                    <option value="Shell">Ốp lưng</option>
                    <option value="Sparkles">Phụ kiện</option>
                  </select>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={ql.link || ""}
                      onChange={(e) => {
                        const newLinks = [...(settings.quick_links || [])];
                        newLinks[idx] = { ...newLinks[idx], link: e.target.value };
                        update("quick_links", newLinks);
                      }}
                      className="input flex-1 text-sm"
                      placeholder="Link chuyển hướng (VD: /category/dien-thoai)"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newLinks = [...(settings.quick_links || [])];
                    newLinks.splice(idx, 1);
                    update("quick_links", newLinks);
                  }}
                  className="p-2 text-red-400 hover:bg-red-400/10 rounded-md transition-colors shrink-0 self-start sm:self-center"
                  title="Xoá"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const newLinks = [...(settings.quick_links || []), { name: "Mục mới", icon: "Smartphone" }];
              update("quick_links", newLinks);
            }}
            className="flex items-center gap-2 text-sm text-circuit-copperLight hover:text-circuit-copper transition-colors"
          >
            <Plus size={16} /> Thêm liên kết nhanh
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-circuit-copper px-6 py-2.5 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          Lưu thay đổi
        </button>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid #1e2c47;
          background: #0b1220;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #e7ecf5;
          outline: none;
        }
        .input:focus {
          border-color: #c87f45;
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-mono text-circuit-muted uppercase mb-1">{label}</span>
      {children}
    </label>
  );
}
