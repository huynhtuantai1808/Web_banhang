"use client";

import { Cpu, Zap, Rocket, Star, ShoppingBag } from "lucide-react";
import { BRANDING } from "@/lib/branding";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { getMediaUrl } from "@/lib/media";

// Danh sách icon hỗ trợ sẵn — thêm import ở trên rồi khai báo tại đây nếu cần icon khác.
const ICONS = {
  cpu: Cpu,
  zap: Zap,
  rocket: Rocket,
  star: Star,
  bag: ShoppingBag,
};

export default function Logo({ size = 20, showName = true }: { size?: number; showName?: boolean }) {
  const { settings } = useSiteSettings();

  // Ưu tiên logo/tên admin đã tuỳ chỉnh qua trang /admin/settings; nếu chưa có thì dùng
  // giá trị mặc định khai báo tĩnh trong branding.ts.
  const logoSrc = settings.logo_image_url ? getMediaUrl(settings.logo_image_url) : BRANDING.logoImageSrc;
  const siteName = settings.site_name || BRANDING.siteName;

  if (logoSrc) {
    return (
      <span className="flex items-center gap-2 font-display text-lg text-circuit-text">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt={siteName} style={{ height: size, width: "auto" }} />
        {showName && siteName}
      </span>
    );
  }

  const IconComponent = ICONS[BRANDING.iconName] || Cpu;

  return (
    <span className="flex items-center gap-2 font-display text-lg text-circuit-text">
      <IconComponent size={size} style={{ color: "var(--accent-color-light)" }} />
      {showName && siteName}
    </span>
  );
}
