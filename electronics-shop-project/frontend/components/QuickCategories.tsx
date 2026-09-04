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
    <div className="bg-gray-100 rounded-2xl p-4 sm:p-6 mb-8 border border-gray-200">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-7 gap-3 sm:gap-4">
        {links.map((item, i) => {
          const IconComponent = item.icon ? (ICON_MAP[item.icon] || Smartphone) : Smartphone;
          return (
            <Link
              key={i}
              href={item.link || `/category/all?keyword=${encodeURIComponent(item.name)}`}
              className="group flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-sm border border-transparent hover:border-circuit-copper/30 hover:shadow-md transition-all duration-300"
            >
              <div className="w-12 h-12 mb-2 rounded-full bg-gray-50 flex items-center justify-center text-circuit-copper group-hover:scale-110 transition-transform duration-300 overflow-hidden">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getMediaUrl(item.image_url)} alt={item.name} className="w-8 h-8 object-contain" />
                ) : (
                  React.createElement(IconComponent, { size: 24, strokeWidth: 1.5 })
                )}
              </div>
              <span className="text-xs sm:text-[13px] text-center font-medium text-gray-700 leading-tight group-hover:text-circuit-copper transition-colors">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
