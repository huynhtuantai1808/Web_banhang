"use client";

interface ProductVideoProps {
  url: string | null | undefined;
}

function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

export default function ProductVideo({ url }: ProductVideoProps) {
  if (!url) return null;

  const embedUrl = getYouTubeEmbedUrl(url);
  if (!embedUrl) return null;

  return (
    <div className="mt-6">
      <h3 className="font-display text-lg text-circuit-text mb-3">Video giới thiệu</h3>
      <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden bg-circuit-panel border border-circuit-line">
        <iframe
          src={embedUrl}
          title="Video giới thiệu sản phẩm"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  );
}
