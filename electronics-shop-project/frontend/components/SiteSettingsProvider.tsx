"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSiteSettings, SiteSettingsOut } from "@/lib/services/settings";
import { BRANDING } from "@/lib/branding";

// Giá trị mặc định dùng trong lúc đang tải / nếu gọi API thất bại — khớp với branding.ts
// để tránh "nhấp nháy" nội dung khi settings từ Backend chưa kịp về.
const DEFAULT_SETTINGS: SiteSettingsOut = {
  site_name: BRANDING.siteName,
  hero_title: BRANDING.tagline,
  hero_subtitle: `${BRANDING.siteName} Store`,
  hero_description: BRANDING.description,
  banner_image_url: null,
  logo_image_url: null,
  accent_color: "#C87F45",
};

interface SiteSettingsContextValue {
  settings: SiteSettingsOut;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  refresh: async () => {},
});

/** Tính một biến thể sáng hơn của màu HEX để dùng cho trạng thái hover — tránh phải yêu cầu
 * admin nhập thêm 1 màu phụ chỉ để hover. */
function lightenHex(hex: string, amount = 0.2): string {
  try {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, Math.round(((num >> 16) & 0xff) + 255 * amount));
    const g = Math.min(255, Math.round(((num >> 8) & 0xff) + 255 * amount));
    const b = Math.min(255, Math.round((num & 0xff) + 255 * amount));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch {
    return hex;
  }
}

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettingsOut>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const data = await getSiteSettings();
      setSettings(data);
      applyAccentColor(data.accent_color);
    } catch {
      // Nếu BE chưa sẵn sàng, giữ nguyên DEFAULT_SETTINGS — trang vẫn hiển thị bình thường
    } finally {
      setLoading(false);
    }
  }

  function applyAccentColor(hex: string) {
    document.documentElement.style.setProperty("--accent-color", hex);
    document.documentElement.style.setProperty("--accent-color-light", lightenHex(hex));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
