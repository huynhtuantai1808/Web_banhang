"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listActiveBanners, Banner } from "@/lib/services/banners";
import { getMediaUrl } from "@/lib/media";

interface BannerCarouselProps {
  position?: "hero" | "promo" | "sidebar";
  className?: string;
}

export default function BannerCarousel({ position = "hero", className = "" }: BannerCarouselProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listActiveBanners(position)
      .then((data) => { if (!cancelled) setBanners(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [position]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (loading || banners.length === 0) return null;

  const banner = banners[current];
  const Wrapper = banner.link_url ? Link : "div";
  const wrapperProps: Record<string, unknown> = banner.link_url ? { href: banner.link_url } : {};

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-circuit-line bg-circuit-panel ${className}`}>
      <div className="relative aspect-[16/8] md:aspect-[16/6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getMediaUrl(banner.image_url)}
          alt={banner.title}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        />
        {/* Overlay text */}
        {(banner.title || banner.cta_label) && (
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent flex items-center">
            <div className="px-8 md:px-12 max-w-xl">
              {banner.title && (
                <h2 className="font-display text-2xl md:text-4xl text-white font-bold uppercase tracking-tight drop-shadow-lg">
                  {banner.title}
                </h2>
              )}
              {banner.subtitle && (
                <p className="text-lg md:text-xl text-circuit-copperLight mt-2 font-medium drop-shadow-md">
                  {banner.subtitle}
                </p>
              )}
              {banner.cta_label && (
                <span className="inline-block mt-4 rounded-full bg-circuit-copper text-circuit-bg px-5 py-2 text-sm font-semibold hover:bg-circuit-copperLight transition-colors">
                  {banner.cta_label} →
                </span>
              )}
            </div>
          </div>
        )}
        <Wrapper {...(wrapperProps as React.AnchorHTMLAttributes<HTMLAnchorElement>)} className="absolute inset-0 block" />
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + banners.length) % banners.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center hover:bg-circuit-copper transition-colors"
            aria-label="Banner trước"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % banners.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center hover:bg-circuit-copper transition-colors"
            aria-label="Banner sau"
          >
            <ChevronRight size={18} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === current ? "bg-circuit-copper w-6" : "bg-white/50 hover:bg-white"
                }`}
                aria-label={`Chuyển tới banner ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
