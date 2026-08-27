"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Tag, Clock } from "lucide-react";
import { getPost, BlogPost } from "@/lib/services/blog";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getMediaUrl } from "@/lib/media";

export default function PromotionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getPost(slug)
      .then(setPost)
      .catch(() => setError("Không tìm thấy bài viết"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    
    <div className="min-h-screen flex flex-col bg-circuit-bg text-circuit-text">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="text-center py-20 text-circuit-muted">Đang tải...</div>
    </main>
      <SiteFooter />
    </div>
  );

  if (error || !post) return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <SiteHeader />
      <div className="text-center py-20">
        <p className="text-circuit-muted">{error || "Không tìm thấy bài viết"}</p>
        <Link href="/promotions" className="mt-4 inline-block text-circuit-copperLight hover:text-circuit-copper text-sm">
          ← Quay lại Khuyến mãi
        </Link>
      </div>
      <SiteFooter />
    </main>
  );

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <SiteHeader />
      <Link href="/promotions" className="inline-flex items-center gap-1.5 text-sm text-circuit-muted hover:text-circuit-copperLight mb-6 transition-colors">
        <ArrowLeft size={14} /> Quay lại Khuyến mãi
      </Link>
      <article>
        {post.image_url && (
          <div className="aspect-video rounded-2xl overflow-hidden mb-6 bg-circuit-bg relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getMediaUrl(post.image_url)} alt={post.title} className="w-full h-full object-cover" />
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 rounded-full bg-circuit-copper text-circuit-bg text-sm font-semibold flex items-center gap-1.5">
                <Tag size={14} /> KHUYẾN MÃI
              </span>
            </div>
          </div>
        )}
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono text-circuit-copperLight bg-circuit-copper/10 border border-circuit-copper/20 uppercase tracking-widest">
            <Tag size={10} /> Khuyến mãi
          </span>
          {post.published_at && (
            <span className="ml-3 inline-flex items-center gap-1 text-xs text-circuit-muted">
              <Clock size={11} />
              {new Date(post.published_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" })}
            </span>
          )}
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-circuit-text uppercase tracking-tight mb-4">
          {post.title}
        </h1>
        {post.summary && (
          <p className="text-lg text-circuit-copperLight mb-6 leading-relaxed">{post.summary}</p>
        )}
        <div className="border-t border-circuit-line pt-6 prose-custom" dangerouslySetInnerHTML={{ __html: post.content || "" }} />
      </article>
      <SiteFooter />
    </main>
  );
}
