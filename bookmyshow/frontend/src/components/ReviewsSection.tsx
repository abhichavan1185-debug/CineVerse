import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { fetchReviews, postReview } from "../api/movies";
import { apiErrorMessage } from "../api/client";

function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-500 text-sm">
      {"★".repeat(value)}
      <span className="text-neutral-300">{"★".repeat(5 - value)}</span>
    </span>
  );
}

export default function ReviewsSection({ movieId }: { movieId: string }) {
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews", movieId],
    queryFn: () => fetchReviews(movieId),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await postReview(movieId, { rating, title, comment });
      setShowForm(false);
      setTitle("");
      setComment("");
      setRating(5);
      queryClient.invalidateQueries({ queryKey: ["reviews", movieId] });
      queryClient.invalidateQueries({ queryKey: ["movie"] });
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't submit your review."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Reviews</h2>
        {me && (
          <button onClick={() => setShowForm((s) => !s)} className="text-xs font-semibold text-brand">
            {showForm ? "Cancel" : "Write a review"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 mb-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600">Your rating:</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setRating(n)} className="text-lg leading-none">
                <span className={n <= rating ? "text-amber-500" : "text-neutral-300"}>★</span>
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Review title (optional)"
            className="input"
          />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts about the movie..."
            rows={3}
            className="input h-auto py-2"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary text-sm h-9 px-4">
            {submitting ? "Submitting…" : "Submit review"}
          </button>
        </form>
      )}

      {isLoading && <p className="text-sm text-neutral-500">Loading reviews…</p>}
      {!isLoading && reviews && reviews.length === 0 && (
        <p className="text-sm text-neutral-500">No reviews yet. Be the first to review this movie.</p>
      )}
      <div className="space-y-4">
        {reviews?.map((r) => (
          <div key={r.id} className="border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <Stars value={r.rating} />
              {r.title && <p className="font-semibold text-sm">{r.title}</p>}
            </div>
            {r.comment && <p className="text-sm text-neutral-600 mt-1">{r.comment}</p>}
            <p className="text-xs text-neutral-400 mt-1">
              {r.user_name} · {new Date(r.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
