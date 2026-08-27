"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Tag, Clock } from "lucide-react";
import { listPosts, BlogPost } from "@/lib/services/blog";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getMediaUrl } from "@/lib/media";

export default function PromotionsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPosts({ category: "promotion", published_only: true })
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-circuit-bg text-circuit-text">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-6 pb-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-circuit-text uppercase tracking-tight">Khuyến mãi</h1>
        <p className="text-circuit-muted mt-2">Các chương trình ưu đãi hấp dẫn dành cho bạn</p>
      </div>
      {loading ? (
        <div className="text-center py-20 text-circuit-muted">Đang tải...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-circuit-line rounded-xl text-circuit-muted">
          Chưa có khuyến mãi nào.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p) => (
            <Link key={p.id} href={`/promotions/${p.slug}`}
              className="group block rounded-xl border border-circuit-line bg-circuit-panel overflow-hidden hover:border-circuit-copper/50 transition-colors">
              <div className="aspect-video bg-circuit-bg overflow-hidden relative">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getMediaUrl(p.image_url)} alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-circuit-muted"><Tag size={32} /></div>
                )}
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-0.5 rounded-full bg-circuit-copper text-circuit-bg text-xs font-semibold">KHUYẾN MÃI</span>
                </div>
              </div>
              <div className="p-4">
                <h2 className="font-display text-base text-circuit-text group-hover:text-circuit-copperLight transition-colors line-clamp-2">
                  {p.title}
                </h2>
                {p.summary && (
                  <p className="text-xs text-circuit-muted mt-2 line-clamp-2">{p.summary}</p>
                )}
                {p.published_at && (
                  <p className="text-[10px] text-circuit-muted mt-3">
                    {new Date(p.published_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
      </main>
      <SiteFooter />
    </div>
  );
}
