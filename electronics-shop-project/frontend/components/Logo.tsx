import { Cpu, Zap, Rocket, Star, ShoppingBag } from "lucide-react";
import { BRANDING } from "@/lib/branding";

// Danh sách icon hỗ trợ sẵn — thêm import ở trên rồi khai báo tại đây nếu cần icon khác.
const ICONS = {
  cpu: Cpu,
  zap: Zap,
  rocket: Rocket,
  star: Star,
  bag: ShoppingBag,
};

export default function Logo({ size = 20, showName = true }: { size?: number; showName?: boolean }) {
  if (BRANDING.logoImageSrc) {
    return (
      <span className="flex items-center gap-2 font-display text-lg text-circuit-text">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRANDING.logoImageSrc} alt={BRANDING.siteName} style={{ height: size, width: "auto" }} />
        {showName && BRANDING.siteName}
      </span>
    );
  }

  const IconComponent = ICONS[BRANDING.iconName] || Cpu;

  return (
    <span className="flex items-center gap-2 font-display text-lg text-circuit-text">
      <IconComponent size={size} className="text-circuit-copperLight" />
      {showName && BRANDING.siteName}
    </span>
  );
}
