"use client";

import { useState } from "react";
import { Star, ThumbsUp, Loader2 } from "lucide-react";
import { ReviewOut, submitReview } from "@/lib/services/products";
import { isCustomerLoggedIn } from "@/lib/auth-storage";
import { ApiError } from "@/lib/apiClient";

interface ReviewListProps {
  reviews: ReviewOut[];
  productId: string;
  averageRating: number | null | undefined;
  reviewCount: number | null | undefined;
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={14}
          className={i < Math.round(value) ? "text-yellow-400 fill-yellow-400" : "text-circuit-line"}
        />
      ))}
    </div>
  );
}

function RatingSummary({ average, count }: { average: number | null | undefined; count: number | null | undefined }) {
  if (!count) return null;
  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="flex flex-col items-center">
        <span className="font-display text-5xl text-circuit-text">{average?.toFixed(1)}</span>
        <StarRating value={average ?? 0} />
        <span className="text-xs text-circuit-muted mt-1">{count} đánh giá</span>
      </div>
      {/* Bar chart */}
      <div className="flex-1 space-y-1">
        {[5, 4, 3, 2, 1].map((star) => (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-circuit-muted">{star}</span>
            <div className="flex-1 h-2 rounded bg-circuit-line overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded"
                style={{ width: `${count ? 70 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewForm({ productId, onSubmitted }: { productId: string; onSubmitted: () => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setError("Vui lòng chọn số sao đánh giá."); return; }
    setSubmitting(true);
    setError(null);
    try {
      await submitReview(productId, { rating, comment: comment || undefined });
      setRating(0);
      setComment("");
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gửi đánh giá thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-circuit-line bg-circuit-panel p-4">
      <h4 className="font-display text-base text-circuit-text">Viết đánh giá của bạn</h4>

      {/* Star picker */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setRating(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            className="p-1 rounded hover:scale-110 transition-transform"
          >
            <Star
              size={28}
              className={
                s <= (hover || rating) ? "text-yellow-400 fill-yellow-400" : "text-circuit-line"
              }
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-circuit-muted self-center">
          {["", "Rất không hài lòng", "Không hài lòng", "Bình thường", "Hài lòng", "Tuyệt vời"][rating] || "Chọn sao"}
        </span>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Chia sẻ trải nghiệm của bạn với sản phẩm này... (tùy chọn)"
        rows={4}
        className="w-full rounded-md border border-circuit-line bg-circuit-bg px-3 py-2 text-sm text-circuit-text placeholder:text-circuit-muted focus:border-circuit-copper focus:outline-none resize-none"
      />

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting || !rating}
        className="flex items-center gap-2 rounded-md bg-circuit-copper px-4 py-2 text-sm font-medium text-circuit-bg hover:bg-circuit-copperLight transition-colors disabled:opacity-50"
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
        Gửi đánh giá
      </button>
    </form>
  );
}

export default function ReviewList({ reviews, productId, averageRating, reviewCount }: ReviewListProps) {
  const [localReviews, setLocalReviews] = useState<ReviewOut[]>(reviews);
  const [allReviews, setAllReviews] = useState<ReviewOut[]>(reviews);
  const [showForm, setShowForm] = useState(false);

  function handleSubmitted() {
    setShowForm(false);
    setAllReviews((prev) => prev);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl text-circuit-text">Đánh giá sản phẩm</h3>
        {isCustomerLoggedIn() && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-circuit-copperLight hover:text-circuit-copper transition-colors"
          >
            + Viết đánh giá
          </button>
        )}
      </div>

      <RatingSummary average={averageRating} count={reviewCount} />

      {showForm && (
        <ReviewForm productId={productId} onSubmitted={handleSubmitted} />
      )}

      {localReviews.length === 0 && (
        <p className="text-sm text-circuit-muted py-4">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
      )}

      <div className="space-y-4">
        {localReviews.map((r) => (
          <div key={r.id} className="border-b border-circuit-line pb-4 last:border-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-circuit-copper/20 flex items-center justify-center text-xs font-bold text-circuit-copper">
                  {r.customer_name?.[0]?.toUpperCase() || "?"}
                </div>
                <span className="text-sm font-medium text-circuit-text">{r.customer_name || "Khách hàng"}</span>
              </div>
              <div className="flex items-center gap-2">
                <StarRating value={r.rating} />
                <span className="text-xs text-circuit-muted">
                  {new Date(r.created_at).toLocaleDateString("vi-VN")}
                </span>
              </div>
            </div>
            {r.comment && (
              <p className="text-sm text-circuit-text leading-relaxed">{r.comment}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
