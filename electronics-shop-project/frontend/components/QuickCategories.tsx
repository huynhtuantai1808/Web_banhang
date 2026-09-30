"use client";

import Link from "next/link";
import { Smartphone, Laptop, Watch, Headphones, Camera, Tablet, HardDrive, Shell, Sparkles } from "lucide-react";
import React from "react";

import { useSiteSettings } from "./SiteSettingsProvider";

import { getMediaUrl } from "@/lib/media";

const ICON_MAP: Record<string, React.ElementType> = {
  Smartphone, Laptop, Watch, Headphones, Camera, Tablet, HardDrive, Shell, Sparkles
};

export default function QuickCategories() {
  const { settings } = useSiteSettings();
  const links = settings.quick_links && settings.quick_links.length > 0 ? settings.quick_links : [];

  if (links.length === 0) return null;
  return (
    <div className="bg-circuit-surface rounded-2xl p-4 sm:p-6 mb-8 border border-circuit-line">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-7 gap-3 sm:gap-4">
        {links.map((item, i) => {
          const IconComponent = item.icon ? (ICON_MAP[item.icon] || Smartphone) : Smartphone;
          return (
            <Link
              key={i}
              href={item.link || `/?category=${encodeURIComponent(item.name)}`}
              className="group flex flex-col items-center justify-center p-3 bg-circuit-panel rounded-xl shadow-sm border border-circuit-line hover:shadow-md transition-all duration-300"
              style={{}}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--circuit-copper) 30%, transparent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
            >
              <div className="w-12 h-12 mb-2 rounded-full bg-circuit-surface flex items-center justify-center text-circuit-copper group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getMediaUrl(item.image_url)} alt={item.name} className="w-8 h-8 object-contain" />
                ) : (
                  React.createElement(IconComponent, { size: 24, strokeWidth: 1.5 })
                )}
              </div>
              <span className="text-xs sm:text-[13px] text-center font-medium text-circuit-text leading-tight group-hover:text-circuit-copper transition-colors">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
